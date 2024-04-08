// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";
import "cog/IGame.sol";

import {Schema, Node, Kind, TRAVEL_SPEED} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BagUtils} from "@ds/utils/BagUtils.sol";
import {Items1155} from "../Items1155.sol";

using Schema for State;

contract InventoryRule is Rule {
    Items1155 tokens;

    constructor(Game g) {
        tokens = new Items1155(address(this), g.getState());
    }

    function getTokensAddress() public view returns (address) {
        return address(tokens);
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.TRANSFER_ITEM_MOBILE_UNIT.selector) {
            // decode the action
            (
                bytes24 actor,
                bytes24[2] memory equipees,
                uint8[2] memory equipSlots,
                uint8[2] memory itemSlots,
                bytes24 toBagId,
                uint64 qty
            ) = abi.decode(action[4:], (bytes24, bytes24[2], uint8[2], uint8[2], bytes24, uint64));
            _transferItem(state, ctx.clock, ctx.sender, actor, equipees, equipSlots, itemSlots, toBagId, qty);
        } else if (bytes4(action) == Actions.EXPORT_ITEM.selector) {
            (bytes24 fromEquipee, uint8 fromEquipSlot, uint8 fromItemSlot, address toAddress, uint64 qty) =
                abi.decode(action[4:], (bytes24, uint8, uint8, address, uint64));
            _exportItem(state, ctx.sender, fromEquipee, fromEquipSlot, fromItemSlot, toAddress, qty);
        } else if (bytes4(action) == Actions.IMPORT_ITEM.selector) {
            (bytes24 itemId, bytes24 toEquipee, uint8 toEquipSlot, uint8 toItemSlot, uint64 qty) =
                abi.decode(action[4:], (bytes24, bytes24, uint8, uint8, uint64));
            _importItem(state, ctx.sender, itemId, toEquipee, toEquipSlot, toItemSlot, qty);
        }

        return state;
    }

    function _exportItem(
        State state,
        address sender,
        bytes24 fromEquipee,
        uint8 fromEquipSlot,
        uint8 fromItemSlot,
        address toAddress,
        uint64 qty
    ) private {
        require(
            state.getOwner(fromEquipee) == Node.Player(sender) || bytes4(fromEquipee) == Kind.Building.selector,
            "fromEquipee not owned by sender"
        );

        // get the item
        bytes24 fromBag = state.getEquipSlot(fromEquipee, fromEquipSlot);
        _requireIsBag(fromBag);
        (bytes24 fromItem, uint64 fromBalance) = state.getItemSlot(fromBag, fromItemSlot);

        // validate enough to burn
        require(fromBalance >= qty, "balance too low");

        // convert to tokenId
        uint256 tokenId = uint256(uint192(fromItem));
        require(tokenId != 0, "tokenid was zero");

        // burn the inventory balance
        state.setItemSlot(fromBag, fromItemSlot, fromItem, fromBalance - qty);

        // mint the token balance to the target
        tokens.mint(toAddress, uint256(uint192(fromItem)), qty, "");
    }

    function _importItem(
        State state,
        address sender,
        bytes24 itemId,
        bytes24 toEquipee,
        uint8 toEquipSlot,
        uint8 toItemSlot,
        uint64 qty
    ) private {
        // convert to tokenId
        uint256 tokenId = uint256(uint192(itemId));
        require(tokenId != 0, "tokenid was zero");

        // validate sender has enough to import
        require(tokens.balanceOf(sender, tokenId) >= qty, "not enough tokens");

        // burn qty of items
        tokens.burn(sender, tokenId, qty);

        // mint into the target inventory
        bytes24 toBag = state.getEquipSlot(toEquipee, toEquipSlot);
        _requireIsBag(toBag);
        (bytes24 existingSlotItem, uint64 existingSlotBalance) = state.getItemSlot(toBag, toItemSlot);
        if (existingSlotBalance != 0) {
            require(itemId == existingSlotItem || existingSlotItem == 0x0, "bad token item");
        }
        state.setItemSlot(toBag, toItemSlot, itemId, existingSlotBalance + qty);
    }

    function _transferItem(
        State state,
        uint64 atTime,
        address sender,
        bytes24 actor,
        bytes24[2] memory equipee,
        uint8[2] memory equipSlot,
        uint8[2] memory itemSlot,
        bytes24 toBagId,
        uint64 qty
    ) private {
        if (bytes4(actor) == Kind.Building.selector) {
            _requireSenderOwnedBuilding(state, actor, sender);
        } else if (bytes4(actor) == Kind.MobileUnit.selector) {
            _requirePlayerOwnedMobileUnit(state, actor, sender);
        } else {
            revert("NoTransferActorMustBeMobileUnitOrBuilding");
        }

        // get acting mobileUnit location
        bytes24 location = BagUtils.getCurrentLocation(state, actor, atTime);

        // check equipees are either the acting mobileUnit
        // at the same location as the acting mobileUnit
        // or adjacent to the acting mobileUnit
        BagUtils.requireEquipeeLocation(state, equipee[0], actor, location, atTime);
        BagUtils.requireEquipeeLocation(state, equipee[1], actor, location, atTime);

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

        // check that the source bag is either owned by the sender or nobody
        // note that when the sender is a building implementation
        // it will never be the owner of a bag because building bags
        // do not have owners
        _requireCanUseBag(state, bags[0], sender);

        // perform transfer between item slots
        _transferBalance(state, bags[0], itemSlot[0], bags[1], itemSlot[1], qty);
    }

    function _requireCanUseBag(State state, bytes24 bag, address sender) private view {
        // note that currently building implementations do
        // not own bags. If they did then we would need to match
        // sender to the implementation contract rather than
        // a player object
        bytes24 player = Node.Player(sender);
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

    function _requirePlayerOwnedMobileUnit(State state, bytes24 mobileUnit, address sender) private view {
        bytes24 player = Node.Player(sender);
        if (state.getOwner(mobileUnit) != player) {
            revert("NoTransferPlayerNotOwner");
        }
    }

    function _requireSenderOwnedBuilding(State state, bytes24 building, address sender) private view {
        bytes24 buildingKind = state.getBuildingKind(building);
        require(buildingKind != 0x0, "no building kind building actor");
        address implementation = state.getImplementation(buildingKind);
        require(implementation != address(0), "no implementation for building actor");
        if (sender != implementation) {
            revert("NoTransferSenderNotBuildingContract");
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
