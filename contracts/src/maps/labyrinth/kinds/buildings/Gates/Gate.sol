// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Dispatcher} from "cog/IDispatcher.sol";
import {State} from "cog/IState.sol";
import {Schema, Kind, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

abstract contract Gate is BuildingKind {
    function getKeyId() internal pure virtual returns (bytes24);

    bytes24 constant _UNIVERSAL_KEY = 0x6a7a67f0771dac36000000010000004b0000000100000001;

    function onUnitArrive(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID) public override {
        // Example of logging the last unit to arrive at a building
        _setDataOnBuilding(ds.getDispatcher(), buildingInstanceID, "lastUnitToArrive", bytes32(mobileUnitID));

        // Example of not allowing a unit to stand on the building tile unless they have the Gate Key item

        ( /*uint8 bagSlot*/ , /*uint8 itemSlot*/, uint64 keyBalance) =
            _findItem(ds.getState(), mobileUnitID, getKeyId());
        (,, uint64 uniKeybalance) = _findItem(ds.getState(), mobileUnitID, _UNIVERSAL_KEY);
        require(keyBalance > 0 || uniKeybalance > 0, "Gate: Unit does not have the right key");
    }

    function onUnitLeave(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID) public override {
        // Example of logging the last unit to leave a building
        _setDataOnBuilding(ds.getDispatcher(), buildingInstanceID, "lastUnitToLeave", bytes32(mobileUnitID));
    }

    function _setDataOnBuilding(Dispatcher dispatcher, bytes24 buildingId, string memory key, bytes32 value) internal {
        dispatcher.dispatch(abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, key, value)));
    }

    // NOTE: This function will return the first bag/slot/balance of the first slot that has the item we're searching for.
    // It doesn't doesn't sum the balance of all slots with the same item kind
    function _findItem(State state, bytes24 mobileUnitID, bytes24 itemId)
        private
        view
        returns (uint8 bagSlot, uint8 itemSlot, uint64 balance)
    {
        for (bagSlot = 0; bagSlot < 2; bagSlot++) {
            bytes24 bagId = state.getEquipSlot(mobileUnitID, bagSlot);

            require(bytes4(bagId) == Kind.Bag.selector, "_findItem(): No bag found at equip slot");

            for (itemSlot = 0; itemSlot < 4; itemSlot++) {
                bytes24 bagItemId;
                (bagItemId, balance) = state.getItemSlot(bagId, itemSlot);
                if (bagItemId == itemId) {
                    // Found item
                    return (bagSlot, itemSlot, balance);
                }
            }
        }

        return (0, 0, 0);
    }
}
