// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, Kind} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract LabyrinthCore is BuildingKind {
    // for respawn
    bytes24 constant _LARGE_ROCKS = 0xbe92755c0000000000000000bdcf2b5d0000000000000001;
    bytes24 constant _CRUSHER = 0xbe92755c0000000000000000e92c4edd0000000000000001;
    bytes24 constant sword = 0x6a7a67f01df41ea10000000000000001000000010000001e;
    bytes24 constant shield = 0x6a7a67f0ab4f7a160000000000000014000000280000000a;
    bytes24 constant armor = 0x6a7a67f06a60bb99000000000000001e0000001400000001;

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public override {
        // Crafting the Playtest Pass
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));

        // resetting the map
        // rocks at room 4
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, 11, -10, -1)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, 13, -12, -1)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, 13, -14, 1)));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, 11, -12, 1)));
        //crusher at room 5
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_CRUSHER, 6, -12, 6)));
        //items at room 3
        int16 q = 14;
        int16 r = -7;
        int16 s = -7;
        bytes24 bagId = bytes24(abi.encodePacked(Kind.Bag.selector, uint96(0), int16(0), q, r, s));
        bytes24 tileId = bytes24(abi.encodePacked(Kind.Tile.selector, uint96(0), int16(0), q, r, s));
        bytes24[] memory items = new bytes24[](4);
        uint64[] memory balances = new uint64[](4);
        items[0] = sword;
        items[1] = shield;
        items[2] = armor;
        items[3] = bytes24(0);
        balances[0] = 1;
        balances[1] = 1;
        balances[2] = 1;
        balances[3] = 0;
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.DEV_SPAWN_BAG, (bagId, address(0), tileId, 0, items, balances))
        );
    }

    // version of use that restricts crafting to building owner, author or allow list
    // these restrictions will not be reflected in the UI unless you make
    // similar changes in BasicFactory.js
    /*function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes memory ) public override {
        State state = GetState(ds);
        CheckIsFriendlyUnit(state, actor, buildingInstance);

        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
    }*/

    // version of use that restricts crafting to units carrying a certain item
    /*function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes memory ) public override {
        // require carrying an idCard
        // you can change idCardItemId to another item id
        CheckIsCarryingItem(state, actor, idCardItemId);
    
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
    }*/

    function GetState(Game ds) internal returns (State) {
        return ds.getState();
    }

    function GetBuildingOwner(State state, bytes24 buildingInstance) internal view returns (bytes24) {
        return state.getOwner(buildingInstance);
    }

    function GetBuildingAuthor(State state, bytes24 buildingInstance) internal view returns (bytes24) {
        bytes24 buildingKind = state.getBuildingKind(buildingInstance);
        return state.getOwner(buildingKind);
    }

    function CheckIsFriendlyUnit(State state, bytes24 actor, bytes24 buildingInstance) internal view {
        require(
            UnitOwnsBuilding(state, actor, buildingInstance) || UnitAuthoredBuilding(state, actor, buildingInstance)
                || UnitOwnedByFriendlyPlayer(state, actor),
            "Unit does not have permission to use this building"
        );
    }

    function UnitOwnsBuilding(State state, bytes24 actor, bytes24 buildingInstance) internal view returns (bool) {
        return state.getOwner(actor) == GetBuildingOwner(state, buildingInstance);
    }

    function UnitAuthoredBuilding(State state, bytes24 actor, bytes24 buildingInstance) internal view returns (bool) {
        return state.getOwner(actor) == GetBuildingAuthor(state, buildingInstance);
    }

    address[] private friendlyPlayerAddresses = [0x402462EefC217bf2cf4E6814395E1b61EA4c43F7];

    function UnitOwnedByFriendlyPlayer(State state, bytes24 actor) internal view returns (bool) {
        address ownerAddress = state.getOwnerAddress(actor);
        for (uint256 i = 0; i < friendlyPlayerAddresses.length; i++) {
            if (friendlyPlayerAddresses[i] == ownerAddress) {
                return true;
            }
        }
        return false;
    }

    // use cli command 'ds get items' for all current possible ids.
    bytes24 idCardItemId = 0x6a7a67f0b29554460000000100000064000000640000004c;

    function CheckIsCarryingItem(State state, bytes24 actor, bytes24 item) internal view {
        require((UnitIsCarryingItem(state, actor, item)), "Unit must be carrying specified item");
    }

    function UnitIsCarryingItem(State state, bytes24 actor, bytes24 item) internal view returns (bool) {
        for (uint8 bagIndex = 0; bagIndex < 2; bagIndex++) {
            bytes24 bag = state.getEquipSlot(actor, bagIndex);
            if (bag != 0) {
                for (uint8 slot = 0; slot < 4; slot++) {
                    (bytes24 resource, /*uint64 balance*/ ) = state.getItemSlot(bag, slot);
                    if (resource == item) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
