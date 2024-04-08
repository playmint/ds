// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";

import {
    Schema,
    Node,
    Kind,
    BiomeKind,
    FacingDirectionKind,
    BuildingCategory,
    BuildingBlockNumKey,
    DEFAULT_ZONE
} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Bounds} from "@ds/utils/Bounds.sol";

using Schema for State;

// Cheats are game actions that are disabled shortly after the world
// deployment. They allow for some initial setup or local development
// testing that would otherwise be illegal.

contract CheatsRule is Rule {
    address authorizedCheater;
    bool disabled;
    bool bypass = true; // just let folks do whatever they want for crying out loud

    constructor(address cheater) {
        authorizedCheater = cheater;
    }

    function isCheatAllowed(address cheater) internal view returns (bool) {
        if (bypass || (!disabled && cheater == authorizedCheater)) {
            return true;
        }
        return false;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.DEV_SPAWN_TILE.selector) {
            require(isCheatAllowed(ctx.sender), "DEV_SPAWN_TILE not allowed");

            (int16 q, int16 r, int16 s) = abi.decode(action[4:], (int16, int16, int16));
            require(Bounds.isInBounds(q, r, s), "DEV_SPAWN_TILE coords out of bounds");

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
            if (bytes4(equipee) == Kind.Tile.selector) {
                (, int16 q, int16 r, int16 s) = state.getTileCoords(equipee);
                require(Bounds.isInBounds(q, r, s), "DEV_SPAWN_BAG coords out of bounds");
            }

            _spawnBag(state, bagID, owner, equipee, equipSlot, slotContents, slotBalances);
        } else if (bytes4(action) == Actions.DEV_SPAWN_BUILDING.selector) {
            require(isCheatAllowed(ctx.sender), "DEV_SPAWN_BUILDING not allowed");

            (bytes24 buildingKind, int16 q, int16 r, int16 s, FacingDirectionKind facingDirection) =
                abi.decode(action[4:], (bytes24, int16, int16, int16, FacingDirectionKind));
            require(Bounds.isInBounds(q, r, s), "DEV_SPAWN_BUILDING coords out of bounds");

            _construct(state, ctx, buildingKind, q, r, s, facingDirection);
        } else if (bytes4(action) == Actions.DEV_DESTROY_TILE.selector) {
            require(isCheatAllowed(ctx.sender), "DEV_DESTROY_TILE not allowed");
            (int16 q, int16 r, int16 s) = abi.decode(action[4:], (int16, int16, int16));
            require(Bounds.isInBounds(q, r, s), "DEV_DESTROY_TILE coords out of bounds");
            _destroyTile(state, q, r, s);
        } else if (bytes4(action) == Actions.DEV_DESTROY_BUILDING.selector) {
            require(isCheatAllowed(ctx.sender), "DEV_DESTROY_BUILDING not allowed");
            (int16 q, int16 r, int16 s) = abi.decode(action[4:], (int16, int16, int16));

            require(Bounds.isInBounds(q, r, s), "DEV_DESTROY_BUILDING coords out of bounds");

            _destroyBuilding(state, q, r, s);
        } else if (bytes4(action) == Actions.DEV_DESTROY_BAG.selector) {
            require(isCheatAllowed(ctx.sender), "DEV_DESTROY_BAG not allowed");

            (
                bytes24 bagID,
                address owner,
                bytes24 equipee, // tile
                uint8 equipSlot,
                bytes24[] memory slotContents
            ) = abi.decode(action[4:], (bytes24, address, bytes24, uint8, bytes24[]));
            if (bytes4(equipee) == Kind.Tile.selector) {
                (, int16 q, int16 r, int16 s) = state.getTileCoords(equipee);
                require(Bounds.isInBounds(q, r, s), "DEV_DESTROY_BAG coords out of bounds");
            }
            _destroyBag(state, bagID, owner, equipee, equipSlot, slotContents);
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
        if (owner != address(0)) {
            state.setOwner(bag, Node.Player(owner));
        }
        state.setEquipSlot(equipee, equipSlot, bag);
    }

    function _spawnTile(State state, int16 q, int16 r, int16 s) private {
        state.setBiome(Node.Tile(DEFAULT_ZONE, q, r, s), BiomeKind.DISCOVERED);
    }

    // allow constructing a building without any materials
    function _construct(
        State state,
        Context calldata ctx,
        bytes24 buildingKind,
        int16 q,
        int16 r,
        int16 s,
        FacingDirectionKind facingDirection
    ) internal {
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

        state.setFacingDirection(buildingInstance, facingDirection);

        // -- Category specific calls

        ( /*uint64 id*/ , BuildingCategory category) = state.getBuildingKindInfo(buildingKind);

        if (category == BuildingCategory.EXTRACTOR) {
            // set initial extraction timestamp
            state.setBlockNum(buildingInstance, uint8(BuildingBlockNumKey.EXTRACTION), ctx.clock);

            // set inital reservoir to full
            state.setBuildingReservoirAtoms(buildingInstance, [uint64(499), uint64(499), uint64(499)]);
        }
    }

    function _destroyBag(
        State state,
        bytes24 bag,
        address owner,
        bytes24 equipee,
        uint8 equipSlot,
        bytes24[] memory slotContents
    ) private {
        for (uint8 i = 0; i < slotContents.length; i++) {
            state.clearItemSlot(bag, i);
        }
        if (owner != address(0)) {
            state.removeOwner(bag);
        }
        state.removeEquipSlot(equipee, equipSlot);
    }

    function _destroyTile(State state, int16 q, int16 r, int16 s) private {
        bytes24 tile = Node.Tile(0, q, r, s);
        state.removeBiome(tile);
    }

    function _destroyBuilding(State state, int16 q, int16 r, int16 s) private {
        bytes24 buildingInstance = Node.Building(0, q, r, s);
        // state.destroyBuilding(Node.Building(DEFAULT_ZONE, q, r, s));
        state.removeBuildingKind(buildingInstance);
        state.removeOwner(buildingInstance);
        state.removeFixedLocation(buildingInstance);
    }
}
