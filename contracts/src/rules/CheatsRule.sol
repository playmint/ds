// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";

import {Schema, Node, BiomeKind, DEFAULT_ZONE} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

// Cheats are game actions that are disabled shortly after the world
// deployment. They allow for some initial setup or local development
// testing that would otherwise be illegal.

contract CheatsRule is Rule {

    address authorizedCheater;
    bool disabled;

    constructor(address cheater) {
        authorizedCheater = cheater;
    }

    function isCheatAllowed(address cheater) internal view returns (bool) {
        if (!disabled && cheater == authorizedCheater) {
            return true;
        }
        return false;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx ) public returns (State) {

        if (bytes4(action) == Actions.DEV_SPAWN_TILE.selector) {
            require(isCheatAllowed(ctx.sender), "DEV_SPAWN_TILE not allowed");

            (int16 q, int16 r, int16 s) = abi.decode(action[4:], (int16, int16, int16));
            _spawnTile(state, q, r, s);

        } else if (bytes4(action) == Actions.DEV_SPAWN_BAG.selector) {
            require(isCheatAllowed(ctx.sender), "DEV_SPAWN_BAG not allowed");

            (
                bytes24 bagID,
                address owner,
                bytes24 equipee,
                uint8 equipSlot,
                bytes24[] memory slotContents,
                uint64[] memory slotBalances
            ) = abi.decode(action[4:], (bytes24, address, bytes24, uint8, bytes24[], uint64[]));
            _spawnBag(state, bagID, owner, equipee, equipSlot, slotContents, slotBalances);

        } else if (bytes4(action) == Actions.DEV_SPAWN_BUILDING.selector) {
            require(isCheatAllowed(ctx.sender), "DEV_SPAWN_BUILDING not allowed");

            (bytes24 buildingKind, int16 q, int16 r, int16 s) = abi.decode(action[4:], (bytes24, int16, int16, int16));
            _construct(state, buildingKind, q, r, s);

        } else if (bytes4(action) == Actions.DEV_SET_MODEL.selector) {
            require(isCheatAllowed(ctx.sender), "DEV_SET_MODEL not allowed");

            (bytes24 entity, string memory model) = abi.decode(action[4:], (bytes24, string));
            state.annotate(entity, "model", model);

        } else if (bytes4(action) == Actions.DEV_DISABLE_CHEATS.selector) {
            require(isCheatAllowed(ctx.sender), "DEV_DISABLE_CHEATS not allowed");

            disabled = true;
        }

        return state;
    }

    function _spawnBag(
        State state,
        bytes24 bag,
        address owner,
        bytes24 equipee,
        uint8 equipSlot,
        bytes24[] memory slotContents,
        uint64[] memory slotBalances
    ) private {
        for (uint8 i = 0; i < slotContents.length; i++) {
            state.setItemSlot(bag, i, slotContents[i], slotBalances[i]);
        }
        state.setOwner(bag, Node.Player(owner));
        state.setEquipSlot(equipee, equipSlot, bag);
    }

    function _spawnTile(State state, int16 q, int16 r, int16 s) private {
        state.setBiome(Node.Tile(DEFAULT_ZONE, q, r, s), BiomeKind.DISCOVERED);
    }

    // allow constructing a building without any materials
    function _construct(State state, bytes24 buildingKind, int16 q, int16 r, int16 s) internal {
        _spawnTile(state, q, r, s);
        bytes24 targetTile = Node.Tile(0, q, r, s);
        bytes24 buildingInstance = Node.Building(0, q, r, s);
        state.setBuildingKind(buildingInstance, buildingKind);
        state.setOwner(buildingInstance, Node.Player(msg.sender));
        state.setFixedLocation(buildingInstance, targetTile);
        // attach the inputs/output bags
        bytes24 inputBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance, "input")))));
        bytes24 outputBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance, "output")))));
        state.setEquipSlot(buildingInstance, 0, inputBag);
        state.setEquipSlot(buildingInstance, 1, outputBag);
    }
}
