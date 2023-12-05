// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {Schema, Node, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";

using Schema for State;

contract NewPlayerRule is Rule {
    bool allowListEnabled;
    mapping(address => uint256) spawnable;

    constructor(address[] memory allowlist) {
        if (allowlist.length > 0) {
            allowListEnabled = true;
        }
        for (uint256 i = 0; i < allowlist.length; i++) {
            spawnable[allowlist[i]] = 1;
        }
    }

    function allow(address addr) public {
        spawnable[addr] = 1;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        // spawn a mobileUnit for any player at any location
        if (bytes4(action) == Actions.SPAWN_MOBILE_UNIT.selector) {
            // check if player allowed to spawn another mobileUnit
            if (allowListEnabled) {
                uint256 spawnableCount = spawnable[ctx.sender];
                if (spawnableCount < 1) {
                    revert("NotAllowListed");
                }
                spawnable[ctx.sender] = spawnable[ctx.sender] - 1;
            }
            // decode action
            (bytes24 mobileUnit) = abi.decode(action[4:], (bytes24));
            // check mobileUnit isn't already owned
            if (mobileUnit == 0 || state.getOwner(mobileUnit) != 0) {
                revert("MobileUnitIdAlreadyClaimed");
            }
            // set the mobileUnit's owner
            state.setOwner(mobileUnit, Node.Player(ctx.sender));
            // set location
            bytes24 locationTile = Node.Tile(DEFAULT_ZONE, 0, 0, 0);
            state.setPrevLocation(mobileUnit, locationTile, 0);
            state.setNextLocation(mobileUnit, locationTile, ctx.clock);
            // give the mobileUnit a couple of bags
            //bytes24 bag0 = _spawnBag(state, mobileUnit, ctx.sender, 0);
            //bytes24 bag1 = _spawnBag(state, mobileUnit, ctx.sender, 1);

            //give the mobileUnit the two starter items
            //state.setItemSlot(bag0, 0, ItemUtils.AcceptanceLetter(), 1);
            //state.setItemSlot(bag0, 1, ItemUtils.IDCard(), 1);

            //give the mobileUnit 100 of each of the base materials
            //state.setItemSlot(bag1, 0, ItemUtils.GreenGoo(), 100);
            //state.setItemSlot(bag1, 1, ItemUtils.BlueGoo(), 100);
            //state.setItemSlot(bag1, 2, ItemUtils.RedGoo(), 100);

            // Accept the first quest in the chain
            //state.setQuestAccepted(Node.Quest("Report to Control"), Node.Player(ctx.sender), 0);
        }

        return state;
    }

    function _spawnBag(State state, bytes24 mobileUnit, address owner, uint8 equipSlot) private returns (bytes24) {
        bytes24 bag = Node.Bag(uint64(uint256(keccak256(abi.encode(mobileUnit, equipSlot)))));
        state.setOwner(bag, Node.Player(owner));
        state.setEquipSlot(mobileUnit, equipSlot, bag);
        return bag;
    }
}
