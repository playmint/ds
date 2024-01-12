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
    BuildingBlockNumKey
} from "@ds/schema/Schema.sol";
import {BagUtils} from "@ds/utils/BagUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {ItemKind} from "@ds/ext/ItemKind.sol";

using Schema for State;
using Math for int128;

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
        // NOTE: No longer care about the quanity. We just check if we can make at least 1
        (bytes24 outputItemID, /*uint64 qty*/ ) = state.getOutput(buildingKind, 0);

        // Output bag is at slot 1 same as crafting building.
        bytes24 outBag = state.getEquipSlot(buildingInstance, 1);
        _requireIsBag(outBag);
        (bytes24 bagItem, uint64 bagBal) = state.getItemSlot(outBag, 0);
        if (bagItem != bytes24(0)) {
            require(bagItem == outputItemID, "Item at slot 0 doesn't match extractor output item");
            require(bagBal < 100, "Not enough space in slot to put output item");
        }

        uint64 qty;

        // Calculate extracted atoms (goo) and check if we have sufficient to create a batch of output items
        {
            uint64[3] memory reservoirAtoms = state.getBuildingReservoirAtoms(buildingInstance);
            uint64[3] memory extractedAtoms = _calcExtractedGoo(state, ctx, buildingInstance);

            for (uint256 i = 0; i < 3; i++) {
                reservoirAtoms[i] = uint64(min(reservoirAtoms[i] + extractedAtoms[i], GOO_RESERVOIR_MAX));
            }

            (uint32[3] memory outputItemAtoms, /*bool isStackable*/ ) = state.getItemStructure(outputItemID);

            // Check we have enough atoms (goo) in the reservoir to make
            require(
                outputItemAtoms[GOO_GREEN] <= reservoirAtoms[GOO_GREEN], "not enough green goo extracted to make item"
            );
            require(outputItemAtoms[GOO_BLUE] <= reservoirAtoms[GOO_BLUE], "not enough blue goo extracted to make item");
            require(outputItemAtoms[GOO_RED] <= reservoirAtoms[GOO_RED], "not enough red goo extracted to make item");

            // How many items can I make with the extracted goo (We pick the lowest mulitple above zero)
            for (uint256 i = 0; i < 3; i++) {
                if (outputItemAtoms[i] > 0) {
                    uint64 numItems = reservoirAtoms[i] / outputItemAtoms[i];
                    if (qty == 0 || numItems < qty) {
                        qty = numItems;
                    }
                }
            }

            // Can only fit 100 items in a slot so set the qty to the difference
            if (bagBal + qty > 100) {
                qty = 100 - bagBal;
            }

            // Spend the extracted atoms
            for (uint256 i = 0; i < 3; i++) {
                reservoirAtoms[i] -= outputItemAtoms[i] * qty;
            }

            state.setBuildingReservoirAtoms(buildingInstance, reservoirAtoms);
            state.setBlockNum(buildingInstance, uint8(BuildingBlockNumKey.EXTRACTION), ctx.clock);
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
        int128 elapsedSecs = Math.fromUInt(
            (ctx.clock - state.getBlockNum(buildingInstance, uint8(BuildingBlockNumKey.EXTRACTION))) * BLOCK_TIME_SECS
        );

        for (uint256 i = 0; i < 3; i++) {
            extractedAtoms[i] = _getGooPerSec64x64(atoms[i]).mul(elapsedSecs).toUInt();
            if (extractedAtoms[i] > GOO_RESERVOIR_MAX) extractedAtoms[i] = GOO_RESERVOIR_MAX;
        }
    }

    // https://www.notion.so/playmint/Extraction-6b36dcb3f95e4ab8a57cb6b99d24bb8f#cb8cc764f9ef436e9847e631ef12b157

    function _getSecsPerGoo64x64(uint64 atomVal) private pure returns (int128) {
        if (atomVal < 70) return Math.fromUInt(0);

        uint256 x = atomVal >= 70 ? atomVal - 70 : 0;
        int128 baseSecsPerGoo64x64 = Math.fromUInt(120).mul(Math.fromUInt(9850).div(Math.fromUInt(10000)).pow(x));

        if (atomVal >= 165) {
            baseSecsPerGoo64x64 = Math.mul(baseSecsPerGoo64x64, Math.fromUInt(75).div(Math.fromUInt(100)));
        } else if (atomVal >= 155) {
            baseSecsPerGoo64x64 = Math.mul(baseSecsPerGoo64x64, Math.fromUInt(85).div(Math.fromUInt(100)));
        }

        ///speeding up 10x
        baseSecsPerGoo64x64 = Math.div(baseSecsPerGoo64x64, Math.fromUInt(5));
        if (baseSecsPerGoo64x64 < Math.fromUInt(4)) return Math.fromUInt(4);
        else return baseSecsPerGoo64x64;
    }

    function _getGooPerSec64x64(uint64 atomVal) private pure returns (int128) {
        int128 secsPerGoo64x64 = _getSecsPerGoo64x64(atomVal);
        return secsPerGoo64x64 > 0 ? Math.fromUInt(1).div(secsPerGoo64x64) : Math.fromUInt(0);
    }

    function _requireIsBag(bytes24 item) private pure {
        if (bytes4(item) != Kind.Bag.selector) {
            revert("ItemIsNotBag");
        }
    }
}
