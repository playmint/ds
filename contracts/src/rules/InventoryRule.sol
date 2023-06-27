// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node, BiomeKind, Kind, TRAVEL_SPEED, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BagUtils} from "@ds/utils/BagUtils.sol";

using Schema for State;

contract InventoryRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.TRANSFER_ITEM_MOBILE_UNIT.selector) {
            // decode the action
            (
                bytes24 mobileUnit,
                bytes24[2] memory equipees,
                uint8[2] memory equipSlots,
                uint8[2] memory itemSlots,
                bytes24 toBagId,
                uint64 qty
            ) = abi.decode(action[4:], (bytes24, bytes24[2], uint8[2], uint8[2], bytes24, uint64));

            _transferItem(
                state, ctx.clock, Node.Player(ctx.sender), mobileUnit, equipees, equipSlots, itemSlots, toBagId, qty
            );
        }

        return state;
    }

    function _transferItem(
        State state,
        uint64 atTime,
        bytes24 player,
        bytes24 mobileUnit,
        bytes24[2] memory equipee,
        uint8[2] memory equipSlot,
        uint8[2] memory itemSlot,
        bytes24 toBagId,
        uint64 qty
    ) private {
        // check that mobileUnit performing action is owned by player
        _requirePlayerOwnedMobileUnit(state, mobileUnit, player);

        // get acting mobileUnit location
        bytes24 location = state.getCurrentLocation(mobileUnit, atTime);

        // check equipees are either the acting mobileUnit
        // at the same location as the acting mobileUnit
        // or adjacent to the acting mobileUnit
        BagUtils.requireEquipeeLocation(state, equipee[0], mobileUnit, location, atTime);
        BagUtils.requireEquipeeLocation(state, equipee[1], mobileUnit, location, atTime);

        // get the things from equipSlots
        bytes24[2] memory bags =
            [state.getEquipSlot(equipee[0], equipSlot[0]), state.getEquipSlot(equipee[1], equipSlot[1])];

        // check the things are bags
        _requireIsBag(bags[0]);

        // create our bag if we need to or check our bag is valid
        if (bags[1] == 0) {
            bags[1] = toBagId;
            state.setEquipSlot(equipee[1], equipSlot[1], bags[1]);
        } else if (bytes4(bags[1]) != Kind.Bag.selector) {
            revert("NoTransferEquipItemIsNotBag");
        }

        // check that the source bag is either owned by the player or nobody
        _requireCanUseBag(state, bags[0], player);

        // perform transfer between item slots
        _transferBalance(state, bags[0], itemSlot[0], bags[1], itemSlot[1], qty);
    }

    function _requireCanUseBag(State state, bytes24 bag, bytes24 player) private view {
        bytes24 owner = state.getOwner(bag);
        if (owner != 0 && owner != player) {
            revert("NoTransferNotYourBag");
        }
    }

    function _requireIsBag(bytes24 thing) private pure {
        if (bytes4(thing) != Kind.Bag.selector) {
            revert("NoTransferEquipItemIsNotBag");
        }
    }

    function _requirePlayerOwnedMobileUnit(State state, bytes24 mobileUnit, bytes24 player) private view {
        if (state.getOwner(mobileUnit) != player) {
            revert("NoTransferPlayerNotOwner");
        }
    }

    function _transferBalance(
        State state,
        bytes24 fromBag,
        uint8 fromItemSlot,
        bytes24 toBag,
        uint8 toItemSlot,
        uint64 qty
    ) private {
        // noop if nothing to xfer
        if (qty == 0) {
            return;
        }

        // abort if source/destination slots are the same
        if (fromBag == toBag && fromItemSlot == toItemSlot) {
            revert("NoTransferSameSlot");
        }

        // get current contents
        (bytes24 fromResource, uint64 fromBalance) = state.getItemSlot(fromBag, fromItemSlot);
        (bytes24 toResource, uint64 toBalance) = state.getItemSlot(toBag, toItemSlot);

        // check that there is actually something in fromResource
        if (fromResource == 0) {
            revert("NoTransferEmptySlot");
        }

        if (toBalance != 0) {
            // check that attempt is to stack same items
            if (fromResource != toResource) {
                revert("NoTransferIncompatibleSlot");
            }

            // check that toResource is stackable
            (, bool toResourceStackable) = state.getItemStructure(toResource);
            if (!toResourceStackable) {
                revert("NoTransferIncompatibleSlot");
            }
        }

        // check that fromSlot has enough balance to xfer
        if (fromBalance < qty) {
            revert("NoTransferLowBalance");
        }

        // check that not trying to stack more than 100
        if ((toBalance + qty) > 100) {
            revert("NoTransferIncompatibleSlot");
        }

        // do the xfer
        uint64 newFromBalance = fromBalance - qty;
        if (newFromBalance == 0) {
            state.clearItemSlot(fromBag, fromItemSlot);
        } else {
            state.setItemSlot(fromBag, fromItemSlot, fromResource, newFromBalance);
        }
        state.setItemSlot(toBag, toItemSlot, fromResource, toBalance + qty);
    }
}
