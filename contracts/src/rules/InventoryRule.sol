// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node, BiomeKind, Kind, TileUtils, TRAVEL_SPEED, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

error NoTransferPlayerNotOwner();
error NoTransferNotYourBag();
error NoTransferLowBalance();
error NoTransferIncompatibleSlot();
error NoTransferSameSlot();
error NoTransferUnsupportedEquipeeKind();
error NoTransferNotSameLocation();
error NoTransferEquipItemIsNotBag();
error NoTransferEmptySlot();

contract InventoryRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.TRANSFER_ITEM_SEEKER.selector) {
            // decode the action
            (
                bytes24 seeker,
                bytes24[2] memory equipees,
                uint8[2] memory equipSlots,
                uint8[2] memory itemSlots,
                bytes24 toBagId,
                uint64 qty
            ) = abi.decode(action[4:], (bytes24, bytes24[2], uint8[2], uint8[2], bytes24, uint64));

            _transferItem(
                state, ctx.clock, Node.Player(ctx.sender), seeker, equipees, equipSlots, itemSlots, toBagId, qty
            );
        }

        return state;
    }

    function _transferItem(
        State state,
        uint64 atTime,
        bytes24 player,
        bytes24 seeker,
        bytes24[2] memory equipee,
        uint8[2] memory equipSlot,
        uint8[2] memory itemSlot,
        bytes24 toBagId,
        uint64 qty
    ) private {
        // check that seeker performing action is owned by player
        _requirePlayerOwnedSeeker(state, seeker, player);

        // get acting seeker location
        bytes24 location = state.getCurrentLocation(seeker, atTime);

        // check equipees are either the acting seeker
        // at the same location as the acting seeker
        // or adjacent to the acting seeker
        _requireEquipeeLocation(state, equipee[0], seeker, location, atTime);
        _requireEquipeeLocation(state, equipee[1], seeker, location, atTime);

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
            revert NoTransferEquipItemIsNotBag();
        }

        // check that the source bag is either owned by the player or nobody
        _requireCanUseBag(state, bags[0], player);

        // perform transfer between item slots
        _transferBalance(state, bags[0], itemSlot[0], bags[1], itemSlot[1], qty);
    }

    function _requireCanUseBag(State state, bytes24 bag, bytes24 player) private view {
        bytes24 owner = state.getOwner(bag);
        if (owner != 0 && owner != player) {
            revert NoTransferNotYourBag();
        }
    }

    function _requireIsBag(bytes24 thing) private pure {
        if (bytes4(thing) != Kind.Bag.selector) {
            revert NoTransferEquipItemIsNotBag();
        }
    }

    function _requirePlayerOwnedSeeker(State state, bytes24 seeker, bytes24 player) private view {
        if (state.getOwner(seeker) != player) {
            revert NoTransferPlayerNotOwner();
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
            if (TileUtils.distance(location, equipee) > 1 || !TileUtils.isDirect(location, equipee)) {
                revert NoTransferNotSameLocation();
            }
        } else if (bytes4(equipee) == Kind.Building.selector) {
            // attached to a building with a fixed location
            bytes24 buildingLocation = state.getFixedLocation(equipee);
            if (TileUtils.distance(location, buildingLocation) > 1 || !TileUtils.isDirect(location, buildingLocation)) {
                revert NoTransferNotSameLocation();
            }
        } else if (bytes4(equipee) == Kind.Seeker.selector) {
            // location on another seeker, check same loc
            bytes24 otherSeekerLocation = state.getCurrentLocation(equipee, atTime);
            if (
                TileUtils.distance(location, otherSeekerLocation) > 1
                    || !TileUtils.isDirect(location, otherSeekerLocation)
            ) {
                revert NoTransferNotSameLocation();
            }
        } else {
            revert NoTransferUnsupportedEquipeeKind();
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
            revert NoTransferSameSlot();
        }

        // get current contents
        (bytes24 fromResource, uint64 fromBalance) = state.getItemSlot(fromBag, fromItemSlot);
        (bytes24 toResource, uint64 toBalance) = state.getItemSlot(toBag, toItemSlot);

        // check that there is actually something in fromResource
        if (fromResource == 0) {
            revert NoTransferEmptySlot();
        }

        // check that toBag's slot is either empty
        // OR contains the same resource type as fromBag
        if (fromResource != toResource && toBalance != 0) {
            revert NoTransferIncompatibleSlot();
        }

        // check that fromSlot has enough balance to xfer
        if (fromBalance < qty) {
            revert NoTransferLowBalance();
        }

        // do the xfer
        state.setItemSlot(fromBag, fromItemSlot, fromResource, fromBalance - qty);
        state.setItemSlot(toBag, toItemSlot, fromResource, toBalance + qty);
    }
}
