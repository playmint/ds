// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Dispatcher} from "cog/IDispatcher.sol";
import {State} from "cog/IState.sol";
import {Schema, Kind, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract PrepGate is BuildingKind {
    bytes24 constant sword = 0x6a7a67f01df41ea10000000000000001000000010000001e;
    bytes24 constant shield = 0x6a7a67f0ab4f7a160000000000000014000000280000000a;
    bytes24 constant armor = 0x6a7a67f06a60bb99000000000000001e0000001400000001;
    bytes24 constant _UNIVERSAL_KEY = 0x6a7a67f0771dac36000000010000004b0000000100000001;

    function onUnitArrive(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID) public override {
        // Example of logging the last unit to arrive at a building
        _setDataOnBuilding(ds.getDispatcher(), buildingInstanceID, "lastUnitToArrive", bytes32(mobileUnitID));

        // Example of not allowing a unit to stand on the building tile unless they have the Gate Key item
        require(_hasNeededItems(ds.getState(), mobileUnitID), "Gate: You are not prepared.");
    }

    function onUnitLeave(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID) public override {
        // Example of logging the last unit to leave a building
        _setDataOnBuilding(ds.getDispatcher(), buildingInstanceID, "lastUnitToLeave", bytes32(mobileUnitID));
    }

    function _setDataOnBuilding(Dispatcher dispatcher, bytes24 buildingId, string memory key, bytes32 value) internal {
        dispatcher.dispatch(abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, key, value)));
    }

    function _hasNeededItems(State state, bytes24 mobileUnitID) private view returns (bool) {
        bool hasSword = false;
        bool hasShield = false;
        bool hasArmor = false;
        bool hasUniversalKey = false;
        uint64 numItems = 0;

        for (uint8 bagSlot = 0; bagSlot < 2; bagSlot++) {
            bytes24 bagId = state.getEquipSlot(mobileUnitID, bagSlot);

            require(bytes4(bagId) == Kind.Bag.selector, "_findItem(): No bag found at equip slot");

            for (uint8 itemSlot = 0; itemSlot < 4; itemSlot++) {
                bytes24 bagItemId;
                uint64 balance;
                (bagItemId, balance) = state.getItemSlot(bagId, itemSlot);
                //TODO: this is shameful
                if (bagItemId == sword) {
                    hasSword = true;
                }
                if (bagItemId == shield) {
                    hasShield = true;
                }
                if (bagItemId == armor) {
                    hasArmor = true;
                }
                if (bagItemId == _UNIVERSAL_KEY) {
                    hasUniversalKey = true;
                }
                numItems += balance;
            }
        }

        return (hasSword && hasShield && hasArmor && numItems == 3) || hasUniversalKey;
    }
}
