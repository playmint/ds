// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/Game.sol";
import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {
    Schema, Node, Kind, BiomeKind, ResourceKind, TileUtils, TRAVEL_SPEED, DEFAULT_ZONE
} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {CraftingRule} from "@ds/rules/CraftingRule.sol";

error BuildingAlreadyRegistered();
error BuildingResourceRequirementsNotMet();
error BuildingMustBeAdjacentToSeeker();
error BuildingNotOwner();
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
            (bytes24 buildingKind, string memory buildingName) = abi.decode(action[4:], (bytes24, string));
            _registerBuildingType(state, Node.Player(ctx.sender), buildingKind, buildingName);
        } else if (bytes4(action) == Actions.REGISTER_BUILDING_CONTRACT.selector) {
            (bytes24 buildingKind, address buildingContractAddr) = abi.decode(action[4:], (bytes24, address));
            _registerBuildingContract(state, Node.Player(ctx.sender), buildingKind, buildingContractAddr);
        } else if (bytes4(action) == Actions.CONSTRUCT_BUILDING_SEEKER.selector) {
            (
                bytes24 seeker, // which seeker is performing the construction
                bytes24 buildingKind, // what kind of building
                bytes24 resourceFromEquipee, // paying from bag equip here
                uint8 resourceFromEquipSlot, // ....from this equip slot
                uint8 resourceFromItemSlot, // ....from this item slot
                int16[3] memory coords
            ) = abi.decode(action[4:], (bytes24, bytes24, bytes24, uint8, uint8, int16[3]));
            // player must own seeker
            if (state.getOwner(seeker) != Node.Player(ctx.sender)) {
                revert SeekerNotOwnedByPlayer();
            }
            _constructBuilding(
                state,
                ctx,
                seeker,
                buildingKind,
                resourceFromEquipee,
                resourceFromEquipSlot,
                resourceFromItemSlot,
                coords
            );
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
        // check that seeker is located at building
        if (seekerTile == 0 || seekerTile != buildingTile) {
            revert BuildingTooFarToUse();
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

    function _registerBuildingType(State state, bytes24 player, bytes24 buildingKind, string memory buildingName)
        private
    {
        // set owner of the building type
        // this might be a regular player, or it might be the same as the buildingContract
        bytes24 existingOwner = state.getOwner(buildingKind);
        if (existingOwner != 0x0) {
            revert BuildingAlreadyRegistered();
        }
        state.setOwner(buildingKind, player);
        state.annotate(buildingKind, "name", buildingName);
    }

    function _registerBuildingContract(State state, bytes24 player, bytes24 buildingKind, address buildingContractAddr)
        private
    {
        bytes24 owner = state.getOwner(buildingKind);
        if (owner != player) {
            revert BuildingNotOwner();
        }
        state.setImplementation(buildingKind, buildingContractAddr);
    }

    function _constructBuilding(
        State state,
        Context calldata ctx,
        bytes24 seeker,
        bytes24 buildingKind,
        bytes24 resourceFromEquipee,
        uint8 resourceFromEquipSlot,
        uint8 resourceFromItemSlot,
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
        // burn resources from given slot
        // [!] for now we are hard coding a fee of "100 of any resource"
        _payConstructionFee(
            state, ctx, seeker, resourceFromEquipee, resourceFromEquipSlot, resourceFromItemSlot, seekerTile
        );
        // set type of building
        state.setBuildingKind(buildingInstance, buildingKind);
        // set building owner to player who created it
        state.setOwner(buildingInstance, Node.Player(ctx.sender));
        // set building location
        state.setFixedLocation(buildingInstance, targetTile);
        // every building gets a bag (owned by the BuildingKind)
        // TODO: this bagID will clash one day and it will be weird, reserve
        // some id space? allow equip directly on things other than bags?
        bytes24 bag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance)))));
        state.setOwner(bag, buildingKind);
        state.setEquipSlot(buildingInstance, 0, bag);
    }

    function _payConstructionFee(
        State state,
        Context calldata ctx,
        bytes24 seeker,
        bytes24 resourceFromEquipee,
        uint8 resourceFromEquipSlot,
        uint8 resourceFromItemSlot,
        bytes24 seekerTile
    ) private {
        // fetch the bag being used to pay
        bytes24 bag = state.getEquipSlot(resourceFromEquipee, resourceFromEquipSlot);
        // check the seeker can use this bag
        _requireCanUseBag(state, bag, Node.Player(ctx.sender));
        _requireEquipeeLocation(state, resourceFromEquipee, seeker, seekerTile, ctx.clock);
        // check we meet the building requirements
        (bytes24 resource, uint64 balance) = state.getItemSlot(bag, resourceFromItemSlot);
        if (balance < BUILDING_COST) {
            revert BuildingResourceRequirementsNotMet();
        }
        balance -= BUILDING_COST;
        // burn the resources
        if (balance == 0) {
            state.clearItemSlot(bag, resourceFromItemSlot);
        } else {
            state.setItemSlot(bag, resourceFromItemSlot, resource, balance);
        }
    }

    function _requireCanUseBag(State state, bytes24 bag, bytes24 player) private view {
        bytes24 owner = state.getOwner(bag);
        if (owner != 0 && owner != player) {
            revert BagNotAccessibleBySeeker();
        }
    }

    function _requireEquipeeLocation(State state, bytes24 equipee, bytes24 seeker, bytes24 location, uint64 atTime)
        private
        view
    {
        if (equipee == seeker) {
            return; // all good, it's the acting seeker's bag so locations match
        } else if (bytes4(equipee) == Kind.Tile.selector) {
            // located on a tile
            if (location != equipee) {
                revert BagNotReachableBySeeker();
            }
        } else if (bytes4(equipee) == Kind.Seeker.selector) {
            // location on another seeker, check same loc
            bytes24 otherSeekerLocation = state.getCurrentLocation(equipee, atTime);
            if (location != otherSeekerLocation) {
                revert BagNotReachableBySeeker();
            }
        } else {
            revert EquipmentNotBag();
        }
    }
}
