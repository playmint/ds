// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Kind, Schema, ResourceKind, AtomKind, Node, Rel} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

error ItemIsNotBag(bytes4 item);

contract CraftingRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata /*ctx*/ ) public returns (State) {
        if (bytes4(action) == Actions.REGISTER_RESOURCE_KIND.selector) {
            // decode the action
            (ResourceKind rk, AtomKind[] memory atomKinds, uint64[] memory numAtoms) =
                abi.decode(action[4:], (ResourceKind, AtomKind[], uint64[]));

            _registerResourceKind(state, rk, atomKinds, numAtoms);
        }

        if (bytes4(action) == Actions.REGISTER_ITEM.selector) {
            (bytes24[4] memory inputItems, uint64[4] memory inputQty, bool isStackable, string memory name) =
                abi.decode(action[4:], (bytes24[4], uint64[4], bool, string));

            _registerItem(state, inputItems, inputQty, isStackable, name);
        }

        if (bytes4(action) == Actions.CRAFT_STACKABLE.selector) {
            // decode the action
            (bytes24 inBag, bytes24 outItem, uint64 outQty, bytes24 destBag, uint8 destItemSlot) =
                abi.decode(action[4:], (bytes24, bytes24, uint64, bytes24, uint8));

            _craft(state, inBag, outItem, outQty, destBag, destItemSlot, true);
        }

        if (bytes4(action) == Actions.CRAFT_EQUIPABLE.selector) {
            // decode the action
            (bytes24 inBag, bytes24 outItem, bytes24 destBag, uint8 destItemSlot) =
                abi.decode(action[4:], (bytes24, bytes24, bytes24, uint8));

            _craft(state, inBag, outItem, 1, destBag, destItemSlot, false);
        }

        return state;
    }

    function _registerResourceKind(State state, ResourceKind rk, AtomKind[] memory atomKinds, uint64[] memory numAtoms)
        internal
    {
        bytes24 resource = Node.Resource(rk);
        _setAtoms(state, resource, atomKinds, numAtoms);
    }

    function _registerItem(
        State state,
        bytes24[4] memory inputItems,
        uint64[4] memory inputQty,
        bool isStackable,
        string memory name
    ) internal {
        // require(inputItems.length == inputQty.length, "_registerItem() inputItems and inputQty list lengths must match");

        uint64[] memory totalAtoms = new uint64[](uint8(AtomKind.COUNT));
        AtomKind[] memory atomKinds = new AtomKind[](uint8(AtomKind.COUNT));

        for (uint8 i = 0; i < 4; i++) {
            uint64[] memory numAtoms = state.getAtoms(inputItems[i]); // keyed by AtomKind
            for (uint8 j = 1; j < uint8(AtomKind.COUNT); j++) {
                //  We halve the number of resultant atoms as per crafting
                // TODO: Scale this so we can have fractional units
                totalAtoms[j] += (inputQty[i] * numAtoms[j]) / 2;
            }
        }

        for (uint8 i = 0; i < uint8(AtomKind.COUNT); i++) {
            atomKinds[i] = AtomKind(i);
        }

        bytes24 item = Node.Item(inputItems, inputQty, isStackable, name);
        _setAtoms(state, item, atomKinds, totalAtoms);
    }

    // TODO: Maybe we don't have two arrays but instead one array with atomKind as index
    function _setAtoms(State state, bytes24 item, AtomKind[] memory atomKinds, uint64[] memory numAtoms) internal {
        require(
            bytes4(item) == Kind.Item.selector || bytes4(item) == Kind.Resource.selector,
            "setAtoms() Node not Item or Resource"
        );

        require(atomKinds.length == numAtoms.length, "setAtoms() The list of atom kinds and number of atoms must match");

        for (uint8 i = 0; i < atomKinds.length; i++) {
            AtomKind ak = atomKinds[i];
            bytes24 atom = Node.Atom(ak);
            if (numAtoms[i] > 0) {
                // The atom kind enum is used for the edge index
                state.set(Rel.Balance.selector, uint8(ak), item, atom, numAtoms[i]);
            }
        }
    }

    function _craft(
        State state,
        bytes24 inBag,
        bytes24 outItem,
        uint64 outQty,
        bytes24 destBag,
        uint8 destItemSlot,
        bool isStackable
    ) private {
        _requireIsBag(inBag);
        _requireIsBag(destBag);
        // TODO: Check that the inBag is owned by the account that is crafting
        require(outQty > 0, "CraftingRule::_craft() Must craft at least 1 item");

        // -- Check destination slot is either empty or is of same type (scoped due to stack limit. Yes the trick worked!)
        {
            (bytes24 itemID, uint64 bal) = state.get(Rel.Balance.selector, destItemSlot, destBag);
            require(
                bal == 0 || (isStackable && bytes4(itemID) == bytes4(outItem)),
                "CraftingRule::_craft() Destination slot expected to be either empty or of same type if stackable"
            );
        }

        bytes24[4] memory inputItems; // Capped to 4 input items
        uint64[4] memory inQty; // Holds the quanity needed to make 1 of the item

        {
            for (uint8 i = 0; i < 4; i++) {
                (bytes24 itemID, uint64 bal) = state.get(Rel.Balance.selector, i, inBag);
                if (bal > 0) {
                    inputItems[i] = itemID;
                    inQty[i] = bal / outQty;

                    // Deduct the cost (burn the resource/item)
                    state.set(Rel.Balance.selector, i, inBag, itemID, 0);
                }
            }
        }

        require(
            outItem == Node.Item(inputItems, inQty, isStackable, _getItemName(outItem)),
            "CraftingRule::_craft() crafting recipe doesn't match output item"
        );

        ( /*bytes24 itemID*/ , uint64 destBal) = state.get(Rel.Balance.selector, destItemSlot, destBag);
        state.set(Rel.Balance.selector, destItemSlot, destBag, outItem, destBal + outQty);
    }

    // TODO: Is there an easier way of doing this? I just want the last 15 bytes of the ID
    function _getItemName(bytes24 itemID) private pure returns (string memory) {
        bytes memory stringBytes = new bytes(15);
        for (uint8 i = 0; i < 15; i++) {
            stringBytes[i] = itemID[(24 - 15) + i];
        }

        return string(stringBytes);
    }

    function _requireIsBag(bytes24 item) private pure {
        if (bytes4(item) != Kind.Bag.selector) {
            revert ItemIsNotBag(bytes4(item));
        }
    }
}
