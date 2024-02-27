// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IGame.sol";
import "cog/IDispatcher.sol";

import {Kind, Schema, Node, Rel, BuildingCategory} from "@ds/schema/Schema.sol";
import {BagUtils} from "@ds/utils/BagUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {ItemKind} from "@ds/ext/ItemKind.sol";

using Schema for State;

contract CraftingRule is Rule {
    Game game;

    constructor(Game g) {
        game = g;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.REGISTER_ITEM_KIND.selector) {
            (bytes24 itemKind, string memory itemName, string memory itemIcon) =
                abi.decode(action[4:], (bytes24, string, string));

            _registerItem(state, Node.Player(ctx.sender), itemKind, itemName, itemIcon);
        }

        if (bytes4(action) == Actions.CRAFT.selector) {
            (bytes24 buildingInstance) = abi.decode(action[4:], (bytes24));

            _craftFromBuildingInputs(state, ctx.sender, buildingInstance);
        }

        return state;
    }

    function _registerItem(State state, bytes24 player, bytes24 itemKind, string memory name, string memory icon)
        internal
    {
        bytes24 existingOwner = state.getOwner(itemKind);
        if (existingOwner != 0x0 && existingOwner != player) {
            revert("already registered");
        }
        state.setOwner(itemKind, player);

        // Check the name is unique
        bytes24 idNode = Node.ID(bytes20(keccak256(abi.encodePacked(name))));
        bytes24 idOwner = state.getOwner(idNode);
        if (idOwner != 0x0 && idOwner != itemKind) {
            revert("item name already registered");
        }
        state.setID(itemKind, idNode);

        state.setData(itemKind, "name", bytes32(bytes(name)));
        state.setData(itemKind, "icon", bytes32(bytes(icon)));

        // FIXME: remove these annotations
        //        we don't need these annotations as we have the setData ones above
        //        but we currently depend on the annotation in various graphql places
        state.annotate(itemKind, "name", name);
        state.annotate(itemKind, "icon", icon);
    }

    function _craftFromBuildingInputs(State state, address sender, bytes24 buildingInstance) private {
        // ensure we are given a legit building id
        require(bytes4(buildingInstance) == Kind.Building.selector, "invalid building id");

        // get building kind
        bytes24 buildingKind = state.getBuildingKind(buildingInstance);
        require(buildingKind != 0x0, "no building kind for building id");

        // Only factories can craft
        {
            ( /*uint64 id*/ , BuildingCategory category) = state.getBuildingKindInfo(buildingKind);
            require(category == BuildingCategory.ITEM_FACTORY, "only item factories can craft");
        }

        // check sender is the contract that implements the building kind
        {
            address implementation = state.getImplementation(buildingKind);
            require(implementation != address(0), "no implementation for building kind");
            require(sender == implementation, "sender must be BuildingKind implementation");
        }

        // get the inBag (it's a bag equip to buildingInstance at slot 0)
        bytes24 inBag = state.getEquipSlot(buildingInstance, 0);
        _requireIsBag(inBag);

        // get the outBag (it's a bag equip to buildingInstance at slot 1)
        bytes24 outBag = state.getEquipSlot(buildingInstance, 1);
        _requireIsBag(outBag);

        _craftFromBag(state, buildingKind, inBag, outBag, 0);
    }

    function _craftFromBag(State state, bytes24 buildingKind, bytes24 inBag, bytes24 outBag, uint8 outItemSlot)
        private
    {
        // fetch the recipe
        bytes24[4] memory wantItem;
        uint64[4] memory wantQty;
        {
            (wantItem[0], wantQty[0]) = state.getInput(buildingKind, 0);
            (wantItem[1], wantQty[1]) = state.getInput(buildingKind, 1);
            (wantItem[2], wantQty[2]) = state.getInput(buildingKind, 2);
            (wantItem[3], wantQty[3]) = state.getInput(buildingKind, 3);

            require(
                wantItem[0] != 0x0 || wantItem[1] != 0x0 || wantItem[2] != 0x0 || wantItem[3] != 0x0,
                "no crafting recipe registered for this building kind"
            );
        }
        (bytes24 outputItem, uint64 outputQty) = state.getOutput(buildingKind, 0);

        // burn input resources
        {
            // get stuff from the given bag
            bytes24[4] memory gotItem;
            uint64[4] memory gotQty;
            for (uint8 i = 0; i < 4; i++) {
                (gotItem[i], gotQty[i]) = state.getItemSlot(inBag, i);
            }

            // check recipe
            require(gotItem[0] == wantItem[0], "input 0 item does not match recipe");
            require(gotItem[1] == wantItem[1], "input 1 item does not match recipe");
            require(gotItem[2] == wantItem[2], "input 2 item does not match recipe");
            require(gotItem[3] == wantItem[3], "input 3 item does not match recipe");

            // check min input qty
            require(gotQty[0] >= wantQty[0], "input 0 qty does not match recipe");
            require(gotQty[1] >= wantQty[1], "input 1 qty does not match recipe");
            require(gotQty[2] >= wantQty[2], "input 2 qty does not match recipe");
            require(gotQty[3] >= wantQty[3], "input 3 qty does not match recipe");

            // burn that many inputs
            state.setItemSlot(inBag, 0, gotItem[0], gotQty[0] - wantQty[0]);
            state.setItemSlot(inBag, 1, gotItem[1], gotQty[1] - wantQty[1]);
            state.setItemSlot(inBag, 2, gotItem[2], gotQty[2] - wantQty[2]);
            state.setItemSlot(inBag, 3, gotItem[3], gotQty[3] - wantQty[3]);
        }

        // spawn the output item(s)
        {
            // check destination slot is either empty or is of same type
            (bytes24 existingOutputItem, uint64 existingOutputBalance) =
                state.get(Rel.Balance.selector, outItemSlot, outBag);
            if (existingOutputBalance > 0) {
                require(outputItem == existingOutputItem, "cannot stack output item: different item types");
                (, bool outputStackable) = state.getItemStructure(outputItem);
                require(outputStackable, "cannot stack output item: not a stackable item");
            }

            // update dest bag slot with item
            state.set(Rel.Balance.selector, outItemSlot, outBag, outputItem, existingOutputBalance + outputQty);
        }
    }

    function _requireIsBag(bytes24 item) private pure {
        if (bytes4(item) != Kind.Bag.selector) {
            revert("ItemIsNotBag");
        }
    }
}
