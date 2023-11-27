// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ABDKMath64x64 as Math} from "abdk-libraries-solidity/ABDKMath64x64.sol";

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
    GOO_RED,
    GOO_GOLD
} from "@ds/schema/Schema.sol";
import {BagUtils} from "@ds/utils/BagUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {ItemKind} from "@ds/ext/ItemKind.sol";

using Schema for State;
using Math for int128;

uint64 constant GOO_RESERVOIR_MAX = 500;
uint64 constant GOO_PER_SEC = GOO_RESERVOIR_MAX / 120; // 4 goo a sec
uint64 constant TILE_ATOM_MAX = 255;

contract GenerationRule is Rule {
    Game game;

    constructor(Game g) {
        game = g;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.BURN.selector) {
            (bytes24 buildingInstance) = abi.decode(action[4:], (bytes24));

            _generate(state, ctx, buildingInstance);
        }

        return state;
    }

    function _generate(State state, Context calldata ctx, bytes24 buildingInstance) private {
        // ensure we are given a legit building id
        require(bytes4(buildingInstance) == Kind.Building.selector, "invalid building id");

        // get building kind
        bytes24 buildingKind = state.getBuildingKind(buildingInstance);
        require(buildingKind != 0x0, "no building kind for building id");

        // Only generator buildings can generate
        {
            ( /*uint64 id*/ , BuildingCategory category) = state.getBuildingKindInfo(buildingKind);
            require(category == BuildingCategory.GENERATOR, "only generator buildings can call BURN");
        }

        // check sender is the contract that implements the building kind
        {
            address implementation = state.getImplementation(buildingKind);
            require(implementation != address(0), "no implementation for building kind");
            require(ctx.sender == implementation, "sender must be BuildingKind implementation");
        }

        // Get input item type we are burning
        (bytes24 inputItemID, /*uint64 qty*/ ) = state.getInput(buildingKind, 0);

        // input bag is at slot 0 same as crafting building.
        bytes24 inBag = state.getEquipSlot(buildingInstance, 0);
        _requireIsBag(inBag);
        (bytes24 bagItem, uint64 bagBal) = state.getItemSlot(inBag, 0);
        if (bagItem != bytes24(0)) {
            require(bagItem == inputItemID, "Item at slot 0 doesn't match generator's registered fuel item");
            require(bagBal > 0, "no fuel to BURN");
        }

        {
            // get current power reservoir level
            uint64[4] memory reservoirAtoms = state.getPowerReservoir(uint64(ctx.clock), buildingInstance);

            // add number of gold atoms we are burning
            (uint32[4] memory inputItemAtoms, /*bool isStackable*/ ) = state.getItemStructure(inputItemID);
            reservoirAtoms[GOO_GOLD] = reservoirAtoms[GOO_GOLD] + (inputItemAtoms[GOO_GOLD] * bagBal);

            state.setBuildingReservoirAtoms(buildingInstance, reservoirAtoms);
            state.setBlockNum(buildingInstance, 0, ctx.clock);
            state.setItemSlot(inBag, 0, inputItemID, 0);
        }
    }

    function min(uint256 a, uint256 b) public pure returns (uint256) {
        return a < b ? a : b;
    }

    function _requireIsBag(bytes24 item) private pure {
        if (bytes4(item) != Kind.Bag.selector) {
            revert("ItemIsNotBag");
        }
    }
}
