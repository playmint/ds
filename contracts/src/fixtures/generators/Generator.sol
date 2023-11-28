// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import {Game} from "cog/IGame.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";

using Schema for State;

contract Generator is BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes memory /*payload*/ ) public {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.BURN, (buildingInstance)));

        {
            State state = ds.getState();
            // reward the actor who fueled this generator with a gold battery
            // but only if they don't already have a gold battery from
            // this generator
            //
            // get unique generator key (0-255)
            uint8 generatorKey = uint8(state.getCounter(buildingInstance));
            // get the item used for reward
            bytes24 battery = ItemUtils.GoldBattery();
            // give actor a battery
            bytes24 batteryBag = state.getEquipSlot(actor, 2);
            if (batteryBag != 0x0) {
                (bytes24 item, uint64 balance) = state.getItemSlot(batteryBag, generatorKey);
                state.setItemSlot(batteryBag, generatorKey, battery, 1);
            }
        }
    }
}
