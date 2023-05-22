// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/Game.sol";
import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node, Kind, TileUtils, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {CraftingRule} from "@ds/rules/CraftingRule.sol";

error BuildingAlreadyRegistered();
error BuildingResourceRequirementsNotMet();
error BuildingMustBeAdjacentToSeeker();
error BuildingTooFarToUse();
error SeekerNotOwnedByPlayer();
error BagNotAccessibleBySeeker();
error BagNotReachableBySeeker();
error EquipmentNotBag();

uint64 constant BUILDING_COST = 100;

using Schema for State;

contract BuildingRule is Rule {
    Game game;

    constructor(Game g) {
        game = g;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.REGISTER_BUILDING_KIND.selector) {
            (
                bytes24 buildingKind,
                string memory buildingName,
                bytes24[4] memory materialItem,
                uint64[4] memory materialQty
            ) = abi.decode(action[4:], (bytes24, string, bytes24[4], uint64[4]));
            _registerBuildingKind(state, Node.Player(ctx.sender), buildingKind, buildingName, materialItem, materialQty);
        } else if (bytes4(action) == Actions.CONSTRUCT_BUILDING_SEEKER.selector) {
            (
                bytes24 seeker, // which seeker is performing the construction
                bytes24 buildingKind, // what kind of building
                int16[3] memory coords
            ) = abi.decode(action[4:], (bytes24, bytes24, int16[3]));
            // player must own seeker
            if (state.getOwner(seeker) != Node.Player(ctx.sender)) {
                revert SeekerNotOwnedByPlayer();
            }
            _constructBuilding(state, ctx, seeker, buildingKind, coords);
        } else if (bytes4(action) == Actions.BUILDING_USE.selector) {
            (bytes24 buildingInstance, bytes24 seekerID, bytes memory payload) =
                abi.decode(action[4:], (bytes24, bytes24, bytes));
            _useBuilding(state, buildingInstance, seekerID, payload, ctx);
        }

        return state;
    }

    function _useBuilding(
        State state,
        bytes24 buildingInstance,
        bytes24 seeker,
        bytes memory payload,
        Context calldata ctx
    ) private {
        // check player owns seeker
        if (Node.Player(ctx.sender) != state.getOwner(seeker)) {
            revert SeekerNotOwnedByPlayer();
        }
        // get location
        bytes24 seekerTile = state.getCurrentLocation(seeker, ctx.clock);
        bytes24 buildingTile = state.getFixedLocation(buildingInstance);
        // check that seeker is located at or adjacent to building
        if (TileUtils.distance(seekerTile, buildingTile) > 1 || !TileUtils.isDirect(seekerTile, buildingTile)) {
            revert BuildingMustBeAdjacentToSeeker();
        }
        // get building kind implementation
        bytes24 buildingKind = state.getBuildingKind(buildingInstance);
        BuildingKind buildingImplementation = BuildingKind(state.getImplementation(buildingKind));
        // if no implementation set, then this is a no-op
        if (address(buildingImplementation) == address(0)) {
            return;
        }
        // call the implementation
        buildingImplementation.use(game, buildingInstance, seeker, payload);
    }

    function _registerBuildingKind(
        State state,
        bytes24 player,
        bytes24 buildingKind,
        string memory buildingName,
        bytes24[4] memory materialItem,
        uint64[4] memory materialQty
    ) private {
        // set owner of the building kind
        bytes24 existingOwner = state.getOwner(buildingKind);
        if (existingOwner != 0x0 && existingOwner != player) {
            revert BuildingAlreadyRegistered();
        }
        state.setOwner(buildingKind, player);
        state.annotate(buildingKind, "name", buildingName);

        // min construction cost
        {
            uint32[3] memory availableInputAtoms;
            for (uint8 i = 0; i < 4; i++) {
                if (materialItem[i] == 0x0) {
                    continue;
                }
                // check input item is registered
                require(state.getOwner(materialItem[i]) != 0x0, "input item must be registered before use in recipe");
                // get atomic structure
                (uint32[3] memory inputAtoms, bool inputStackable) = state.getItemStructure(materialItem[i]);
                if (inputStackable) {
                    require(materialQty[i] > 0 && materialQty[i] <= 100, "stackable input item must be qty 0-100");
                } else {
                    require(materialQty[i] == 1, "equipable input item must have qty=1");
                }
                availableInputAtoms[0] = availableInputAtoms[0] + (inputAtoms[0] * uint32(materialQty[i]));
                availableInputAtoms[1] = availableInputAtoms[1] + (inputAtoms[1] * uint32(materialQty[i]));
                availableInputAtoms[2] = availableInputAtoms[2] + (inputAtoms[2] * uint32(materialQty[i]));
            }

            require(availableInputAtoms[0] >= 50, "min construction cost is 50 atom[0]");
            require(availableInputAtoms[1] >= 50, "min construction cost is 50 atom[1]");
            require(availableInputAtoms[2] >= 50, "min construction cost is 50 atom[2]");
        }

        // store the construction materials recipe
        state.setMaterial(buildingKind, 0, materialItem[0], materialQty[0]);
        state.setMaterial(buildingKind, 1, materialItem[1], materialQty[1]);
        state.setMaterial(buildingKind, 2, materialItem[2], materialQty[2]);
        state.setMaterial(buildingKind, 3, materialItem[3], materialQty[3]);
    }

    function _constructBuilding(
        State state,
        Context calldata ctx,
        bytes24 seeker,
        bytes24 buildingKind,
        int16[3] memory coords
    ) private {
        // get seeker location
        bytes24 seekerTile = state.getCurrentLocation(seeker, ctx.clock);
        bytes24 targetTile = Node.Tile(DEFAULT_ZONE, coords[0], coords[1], coords[2]);
        // check that target is same tile or adjacent to seeker
        if (TileUtils.distance(seekerTile, targetTile) > 1 || !TileUtils.isDirect(seekerTile, targetTile)) {
            revert BuildingMustBeAdjacentToSeeker();
        }
        bytes24 buildingInstance = Node.Building(DEFAULT_ZONE, coords[0], coords[1], coords[2]);
        // burn resources from given towards construction
        _payConstructionFee(state, buildingKind, buildingInstance);
        // set type of building
        state.setBuildingKind(buildingInstance, buildingKind);
        // set building owner to player who created it
        state.setOwner(buildingInstance, Node.Player(ctx.sender));
        // set building location
        state.setFixedLocation(buildingInstance, targetTile);
        // attach the inputs/output bags
        bytes24 inputBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance, "input")))));
        bytes24 outputBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance, "output")))));
        state.setEquipSlot(buildingInstance, 0, inputBag);
        state.setEquipSlot(buildingInstance, 1, outputBag);
    }

    function _payConstructionFee(State state, bytes24 buildingKind, bytes24 buildingInstance) private {
        // fetch the buildingBag
        bytes24 buildingBag = state.getEquipSlot(buildingInstance, 0);
        require(bytes4(buildingBag) == Kind.Bag.selector, "no construction bag found");
        // fetch the recipe
        bytes24[4] memory wantItem;
        uint64[4] memory wantQty;
        {
            (wantItem[0], wantQty[0]) = state.getMaterial(buildingKind, 0);
            (wantItem[1], wantQty[1]) = state.getMaterial(buildingKind, 1);
            (wantItem[2], wantQty[2]) = state.getMaterial(buildingKind, 2);
            (wantItem[3], wantQty[3]) = state.getMaterial(buildingKind, 3);
            // get stuff from the given bag
            bytes24[4] memory gotItem;
            uint64[4] memory gotQty;
            for (uint8 i = 0; i < 4; i++) {
                (gotItem[i], gotQty[i]) = state.getItemSlot(buildingBag, i);
            }

            // check recipe items
            require(gotItem[0] == wantItem[0], "input 0 item does not match construction recipe");
            require(gotItem[1] == wantItem[1], "input 1 item does not match construction recipe");
            require(gotItem[2] == wantItem[2], "input 2 item does not match construction recipe");
            require(gotItem[3] == wantItem[3], "input 3 item does not match construction recipe");

            // check qty
            require(gotQty[0] >= wantQty[0], "input 0 qty does not match construction recipe");
            require(gotQty[1] >= wantQty[1], "input 0 qty does not match construction recipe");
            require(gotQty[2] >= wantQty[2], "input 0 qty does not match construction recipe");
            require(gotQty[3] >= wantQty[3], "input 0 qty does not match construction recipe");

            // burn everything in the buildingBag so we have a nice clean bag ready
            // to be used for other things like crafting... overpay at your peril
            state.clearItemSlot(buildingBag, 0);
            state.clearItemSlot(buildingBag, 1);
            state.clearItemSlot(buildingBag, 2);
            state.clearItemSlot(buildingBag, 3);
        }
    }

    function _requireCanUseBag(State state, bytes24 bag, bytes24 player) private view {
        bytes24 owner = state.getOwner(bag);
        if (owner != 0 && owner != player) {
            revert BagNotAccessibleBySeeker();
        }
    }

    function _spawnBag(State state, bytes24 seeker, address owner, uint8 equipSlot) private {
        bytes24 bag = Node.Bag(uint64(uint256(keccak256(abi.encode(seeker, equipSlot)))));
        state.setOwner(bag, Node.Player(owner));
        state.setEquipSlot(seeker, equipSlot, bag);
    }
}
