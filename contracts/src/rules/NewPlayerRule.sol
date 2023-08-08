// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {Schema, Node, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

contract NewPlayerRule is Rule {
    mapping(address => uint256) spawnable;

    constructor(address[] memory allowlist) {
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
            uint256 spawnableCount = spawnable[ctx.sender];
            if (spawnableCount < 1) {
                revert("NotAllowListed");
            }
            spawnable[ctx.sender] = spawnable[ctx.sender] - 1;
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
            _spawnBag(state, mobileUnit, ctx.sender, 0);
            _spawnBag(state, mobileUnit, ctx.sender, 1);
        }

        return state;
    }

    function _spawnBag(State state, bytes24 mobileUnit, address owner, uint8 equipSlot) private {
        bytes24 bag = Node.Bag(uint64(uint256(keccak256(abi.encode(mobileUnit, equipSlot)))));
        state.setOwner(bag, Node.Player(owner));
        state.setEquipSlot(mobileUnit, equipSlot, bag);
    }
}
