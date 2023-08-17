// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IGame.sol";
import "cog/IDispatcher.sol";

import {
    Kind,
    Schema,
    Node,
    Rel,
    BuildingCategory,
    BLOCK_TIME_SECS,
    GOO_GREEN,
    GOO_BLUE,
    GOO_RED
} from "@ds/schema/Schema.sol";
import {BagUtils} from "@ds/utils/BagUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {ItemKind} from "@ds/ext/ItemKind.sol";

using Schema for State;

uint64 constant GOO_RESERVOIR_MAX = 500;
uint64 constant GOO_PER_SEC = GOO_RESERVOIR_MAX / 120; // 4 goo a sec
uint64 constant TILE_ATOM_MAX = 255;

contract ExtractionRule is Rule {
    Game game;

    constructor(Game g) {
        game = g;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.EXTRACT.selector) {
            (bytes24 buildingInstance) = abi.decode(action[4:], (bytes24));

            _extract(state, ctx, buildingInstance);
        }

        return state;
    }

    function _extract(State state, Context calldata ctx, bytes24 buildingInstance) private {
        // ensure we are given a legit building id
        require(bytes4(buildingInstance) == Kind.Building.selector, "invalid building id");

        // get building kind
        bytes24 buildingKind = state.getBuildingKind(buildingInstance);
        require(buildingKind != 0x0, "no building kind for building id");

        // Only extraction buildings can extract
        {
            ( /*uint64 id*/ , BuildingCategory category) = state.getBuildingKindInfo(buildingKind);
            require(category == BuildingCategory.EXTRACTOR, "extraction buildings can extract goo");
        }

        // check sender is the contract that implements the building kind
        {
            address implementation = state.getImplementation(buildingKind);
            require(implementation != address(0), "no implementation for building kind");
            require(ctx.sender == implementation, "sender must be BuildingKind implementation");
        }

        // Get output item and qty
        (bytes24 outputItemID, uint64 qty) = state.getOutput(buildingKind, 0);

        // Calculate extracted atoms (goo) and check if we have sufficient to create a batch of output items
        {
            uint64[3] memory reservoirAtoms = state.getBuildingReservoirAtoms(buildingInstance);
            uint64[3] memory extractedAtoms = _calcExtractedGoo(state, ctx, buildingInstance);

            reservoirAtoms[GOO_GREEN] =
                uint64(min(reservoirAtoms[GOO_GREEN] + extractedAtoms[GOO_GREEN], GOO_RESERVOIR_MAX));
            reservoirAtoms[GOO_BLUE] =
                uint64(min(reservoirAtoms[GOO_BLUE] + extractedAtoms[GOO_BLUE], GOO_RESERVOIR_MAX));
            reservoirAtoms[GOO_RED] = uint64(min(reservoirAtoms[GOO_RED] + extractedAtoms[GOO_RED], GOO_RESERVOIR_MAX));

            (uint32[3] memory outputItemAtoms, /*bool isStackable*/ ) = state.getItemStructure(outputItemID);

            // Check we have enough atoms (goo) in the reservoir to make
            require(
                outputItemAtoms[GOO_GREEN] * qty <= reservoirAtoms[GOO_GREEN],
                "not enough green goo extracted to make item"
            );
            require(
                outputItemAtoms[GOO_BLUE] * qty <= reservoirAtoms[GOO_BLUE],
                "not enough blue goo extracted to make item"
            );
            require(
                outputItemAtoms[GOO_RED] * qty <= reservoirAtoms[GOO_RED], "not enough red goo extracted to make item"
            );

            reservoirAtoms[GOO_GREEN] -= outputItemAtoms[GOO_GREEN] * qty;
            reservoirAtoms[GOO_BLUE] -= outputItemAtoms[GOO_BLUE] * qty;
            reservoirAtoms[GOO_RED] -= outputItemAtoms[GOO_RED] * qty;

            state.setBuildingReservoirAtoms(buildingInstance, reservoirAtoms);
            state.setBlockNum(buildingInstance, 0, ctx.clock);
        }

        // Output bag is at slot 1 same as crafting building.
        bytes24 outBag = state.getEquipSlot(buildingInstance, 1);
        _requireIsBag(outBag);

        (bytes24 bagItem, uint64 bagBal) = state.getItemSlot(outBag, 0);

        if (bagItem != bytes24(0)) {
            require(bagItem == outputItemID, "Item at slot 0 doesn't match extractor output item");

            // TODO: Should we be filling up the other slots?
            require(bagBal + qty <= 100, "Not enough space in slot to put output item");
        }

        state.setItemSlot(outBag, 0, outputItemID, bagBal + qty);
    }

    function min(uint256 a, uint256 b) public pure returns (uint256) {
        return a < b ? a : b;
    }

    function _calcExtractedGoo(State state, Context calldata ctx, bytes24 buildingInstance)
        private
        view
        returns (uint64[3] memory extractedAtoms)
    {
        // Get the goo atoms for the tile
        bytes24 tile = state.getFixedLocation(buildingInstance);
        uint64[3] memory atoms = state.getTileAtomValues(tile);

        // Get time passed. TODO: Cog to expose a global clock in the state so we have some source of constant time
        uint64 elapsedSecs = (ctx.clock - state.getBlockNum(buildingInstance, 0)) * BLOCK_TIME_SECS;

        // How much would we have harvested if the tile goo was 255
        uint64 maxHarvestPotential = elapsedSecs / GOO_PER_SEC;

        extractedAtoms[GOO_GREEN] = (((atoms[GOO_GREEN] * 100) / TILE_ATOM_MAX) * maxHarvestPotential) / 100;
        extractedAtoms[GOO_BLUE] = (((atoms[GOO_BLUE] * 100) / TILE_ATOM_MAX) * maxHarvestPotential) / 100;
        extractedAtoms[GOO_RED] = (((atoms[GOO_RED] * 100) / TILE_ATOM_MAX) * maxHarvestPotential) / 100;
    }

    function _requireIsBag(bytes24 item) private pure {
        if (bytes4(item) != Kind.Bag.selector) {
            revert("ItemIsNotBag");
        }
    }
}
