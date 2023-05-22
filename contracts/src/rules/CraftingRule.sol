// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/Game.sol";
import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Kind, Schema, Node, Rel, BagUtils} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {ItemKind} from "@ds/ext/ItemKind.sol";

using Schema for State;

error ItemIsNotBag(bytes4 item);

contract CraftingRule is Rule {
    Game game;

    constructor(Game g) {
        game = g;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx ) public returns (State) {
        if (bytes4(action) == Actions.REGISTER_ITEM_KIND.selector) {
            (bytes24 itemKind, string memory itemName, string memory itemIcon) = abi.decode(action[4:], (bytes24, string, string));

            _registerItem(state, Node.Player(ctx.sender), itemKind, itemName, itemIcon);
        }

        if (bytes4(action) == Actions.REGISTER_CRAFT_RECIPE.selector) {
            (bytes24 buildingKind, bytes24[4] memory inputItem, uint64[4] memory inputQty, bytes24 outputItem, uint64 outputQty) = abi.decode(action[4:], (bytes24, bytes24[4], uint64[4], bytes24, uint64));

            _registerRecipe(state, Node.Player(ctx.sender), buildingKind, inputItem, inputQty, outputItem, outputQty);
        }

        if (bytes4(action) == Actions.CRAFT.selector) {
            (bytes24 buildingInstance) = abi.decode(action[4:], (bytes24));

            _craft(state, ctx.sender, buildingInstance);
        }

        return state;
    }

    function _registerItem(
        State state,
        bytes24 player,
        bytes24 itemKind,
        string memory name,
        string memory icon
    ) internal {
        state.setOwner(itemKind, player);
        state.annotate(itemKind, "name", name);
        state.annotate(itemKind, "icon", icon);
    }

    function _registerRecipe(
        State state,
        bytes24 player,
        bytes24 buildingKind,
        bytes24[4] memory inputItem,
        uint64[4] memory inputQty,
        bytes24 outputItem,
        uint64 outputQty
    ) internal {
        (uint32[3] memory outputAtoms, bool outputStackable) = state.getItemStructure(outputItem);
        {
            bytes24 owner = state.getOwner(buildingKind);
            require(owner == player, "only building kind owner can configure building crafting");
            if (outputStackable){
                require(outputQty > 0 && outputQty <= 100, "stackable output qty must be between 0-100");
            } else {
                require(outputQty == 1, "equipable item crafting cannot output multiple items");
            }

            // check that the output item has been registerd
            bytes24 outputOwner = state.getOwner(outputItem);
            require(outputOwner != 0x0, "output item must be a registered item");

            // if player is not the owner of the item, then ask the item implementation contract
            // if it's ok to use this item as an output
            if (outputOwner != player) {
                address implementation = state.getImplementation(outputItem);
                require(implementation != address(0), "you are not the owner of the output item and no item contract exists to ask for permission");
                ItemKind kind = ItemKind(implementation);
                require(kind.onRegisterRecipeOutput(
                    game,
                    player,
                    buildingKind,
                    inputItem,
                    inputQty,
                    outputItem,
                    outputQty
                ), "owner of the output item denied use in crafting");
            }
        }

        // calc total output atoms
        uint32[3] memory totalOutputAtoms;
        totalOutputAtoms[0] = outputAtoms[0] * uint32(outputQty);
        totalOutputAtoms[1] = outputAtoms[1] * uint32(outputQty);
        totalOutputAtoms[2] = outputAtoms[2] * uint32(outputQty);

        // calc total input atoms available to use
        {
            uint32[3] memory availableInputAtoms;
            for (uint8 i=0; i<4; i++) {
                if (inputItem[i] == 0x0) {
                    continue;
                }
                // check input item is registered
                require(state.getOwner(inputItem[i]) != 0x0, "input item must be registered before use in recipe");
                // get atomic structure
                (uint32[3] memory inputAtoms, bool inputStackable) = state.getItemStructure(inputItem[i]);
                if (inputStackable){
                    require(inputQty[i] > 0 && inputQty[i] <= 100, "stackable input item must be qty 0-100");
                } else {
                    require(inputQty[i] == 1, "equipable input item must have qty=1");
                }
                availableInputAtoms[0] = availableInputAtoms[0] + (inputAtoms[0] * uint32(inputQty[i])) / 2;
                availableInputAtoms[1] = availableInputAtoms[1] + (inputAtoms[1] * uint32(inputQty[i])) / 2;
                availableInputAtoms[2] = availableInputAtoms[2] + (inputAtoms[2] * uint32(inputQty[i])) / 2;
            }

            // require that the total number of each atom in the total number of
            // output items is less than half of the total input of each atom
            require(availableInputAtoms[0] >= totalOutputAtoms[0], "cannot craft an item that outputs more 0-atoms than it inputs");
            require(availableInputAtoms[1] >= totalOutputAtoms[1], "cannot craft an item that outputs more 1-atoms than it inputs");
            require(availableInputAtoms[2] >= totalOutputAtoms[2], "cannot craft an item that outputs more 2-atoms than it inputs");
        }

        // store the recipe
        state.setInput(buildingKind, 0, inputItem[0], inputQty[0]);
        state.setInput(buildingKind, 1, inputItem[1], inputQty[1]);
        state.setInput(buildingKind, 2, inputItem[2], inputQty[2]);
        state.setInput(buildingKind, 3, inputItem[3], inputQty[3]);
        state.setOutput(buildingKind, 0, outputItem, outputQty);
    }

    function _craft(
        State state,
        address sender,
        bytes24 buildingInstance
    ) private {

        // ensure we are given a legit building id
        require(bytes4(buildingInstance) == Kind.Building.selector, "invalid building id");

        // get building kind
        bytes24 buildingKind = state.getBuildingKind(buildingInstance);
        require(buildingKind != 0x0, "no building kind for building id");

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

        _craft2(state, buildingKind, inBag, outBag, 0);
    }

    function _craft2(
        State state,
        bytes24 buildingKind,
        bytes24 inBag,
        bytes24 outBag,
        uint8 outItemSlot
    ) private {
        // fetch the recipe
        bytes24[4] memory wantItem;
        uint64[4] memory wantQty;
        {
            (wantItem[0], wantQty[0]) = state.getInput(buildingKind, 0);
            (wantItem[1], wantQty[1]) = state.getInput(buildingKind, 1);
            (wantItem[2], wantQty[2]) = state.getInput(buildingKind, 2);
            (wantItem[3], wantQty[3]) = state.getInput(buildingKind, 3);

            require(
                wantItem[0] != 0x0 ||
                wantItem[1] != 0x0 ||
                wantItem[2] != 0x0 ||
                wantItem[3] != 0x0,
                "no crafting recipe registered for this building kind"
            );
        }
        (bytes24 outputItem, uint64 outputQty) = state.getOutput(buildingKind, 0);

        // burn input resources
        {
            // get stuff from the given bag
            bytes24[4] memory gotItem;
            uint64[4] memory gotQty;
            for (uint8 i = 0; i<4; i++) {
                (gotItem[i], gotQty[i]) = state.getItemSlot(inBag, i);
            }

            // check recipe
            require(gotItem[0] == wantItem[0], "input 0 item does not match recipe");
            require(gotItem[1] == wantItem[1], "input 1 item does not match recipe");
            require(gotItem[2] == wantItem[2], "input 2 item does not match recipe");
            require(gotItem[3] == wantItem[3], "input 3 item does not match recipe");

            // check min input qty
            require(gotQty[0] >= wantQty[0], "input 0 qty does not match recipe");
            require(gotQty[1] >= wantQty[1], "input 0 qty does not match recipe");
            require(gotQty[2] >= wantQty[2], "input 0 qty does not match recipe");
            require(gotQty[3] >= wantQty[3], "input 0 qty does not match recipe");

            // burn that many inputs
            state.setItemSlot(inBag, 0, gotItem[0], gotQty[0] - wantQty[0]);
            state.setItemSlot(inBag, 1, gotItem[1], gotQty[1] - wantQty[1]);
            state.setItemSlot(inBag, 2, gotItem[2], gotQty[2] - wantQty[2]);
            state.setItemSlot(inBag, 3, gotItem[3], gotQty[3] - wantQty[3]);
        }

        // spawn the output item(s)
        {
            // check destination slot is either empty or is of same type
            (bytes24 existingOutputItem, uint64 existingOutputBalance) = state.get(Rel.Balance.selector, outItemSlot, outBag);
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
            revert ItemIsNotBag(bytes4(item));
        }
    }
}
