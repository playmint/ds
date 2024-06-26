// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IGame.sol";

import {
    Schema,
    Node,
    Kind,
    BiomeKind,
    FacingDirectionKind,
    BuildingCategory,
    BuildingBlockNumKey,
    Q,
    R,
    S,
    Z
} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {Bounds} from "@ds/utils/Bounds.sol";
import {IZoneKind} from "@ds/ext/ZoneKind.sol";
import {IItemKind} from "@ds/ext/ItemKind.sol";

using Schema for State;

// Cheats are game actions that are disabled shortly after the world
// deployment. They allow for some initial setup or local development
// testing that would otherwise be illegal.

contract CheatsRule is Rule {
    Game game;

    constructor(Game g) {
        game = g;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.DEV_SPAWN_TILE.selector) {
            (int16 z, int16 q, int16 r, int16 s) = abi.decode(action[4:], (int16, int16, int16, int16));

            _spawnTile(state, ctx, z, q, r, s);
        } else if (bytes4(action) == Actions.DEV_SPAWN_BAG.selector) {
            (
                int16 z,
                int16 q,
                int16 r,
                int16 s,
                uint8 equipSlot,
                bytes24[] memory slotContents,
                uint64[] memory slotBalances
            ) = abi.decode(action[4:], (int16, int16, int16, int16, uint8, bytes24[], uint64[]));

            _spawnBag(state, ctx, [z, q, r, s], equipSlot, slotContents, slotBalances);
        } else if (bytes4(action) == Actions.DEV_SPAWN_BUILDING.selector) {
            (bytes24 buildingKind, int16 z, int16 q, int16 r, int16 s, FacingDirectionKind facingDirection) =
                abi.decode(action[4:], (bytes24, int16, int16, int16, int16, FacingDirectionKind));

            _construct(state, ctx, buildingKind, z, q, r, s, facingDirection);
        } else if (bytes4(action) == Actions.DEV_DESTROY_TILE.selector) {
            (int16 z, int16 q, int16 r, int16 s) = abi.decode(action[4:], (int16, int16, int16, int16));

            _destroyTile(state, ctx, z, q, r, s);
        } else if (bytes4(action) == Actions.DEV_DESTROY_BUILDING.selector) {
            (int16 z, int16 q, int16 r, int16 s) = abi.decode(action[4:], (int16, int16, int16, int16));

            _destroyBuilding(state, ctx, z, q, r, s);
        } else if (bytes4(action) == Actions.DEV_DESTROY_AUTO_QUEST.selector) {
            (string memory name, int16 zone) = abi.decode(action[4:], (string, int16));

            _destroyAutoQuest(state, ctx, name, zone);
        } else if (bytes4(action) == Actions.DEV_DESTROY_BAG.selector) {
            (
                bytes24 bagID,
                address owner,
                bytes24 equipee, // tile
                uint8 equipSlot,
                bytes24[] memory slotContents
            ) = abi.decode(action[4:], (bytes24, address, bytes24, uint8, bytes24[]));
            _destroyBag(state, ctx, bagID, owner, equipee, equipSlot, slotContents);
        } else if (bytes4(action) == Actions.DEV_ASSIGN_AUTO_QUEST.selector) {
            (string memory name, int16 zone) = abi.decode(action[4:], (string, int16));

            _assignAutoQuest(state, ctx, name, zone);
        }

        return state;
    }

    function _spawnBag(
        State state,
        Context calldata ctx,
        int16[4] memory coords,
        uint8 equipSlot,
        bytes24[] memory slotContents,
        uint64[] memory slotBalances
    ) private {
        require(Bounds.isInBounds(coords[Q], coords[R], coords[S]), "coords out of bounds");
        bytes24 bag = Node.Bag(
            uint64(uint256(keccak256(abi.encode("devbag", coords[Z], coords[Q], coords[R], coords[S], equipSlot))))
        );
        bytes24 zone = Node.Zone(coords[Z]);
        for (uint8 i = 0; i < slotContents.length; i++) {
            state.setItemSlot(bag, i, slotContents[i], slotBalances[i]);
            IItemKind itemImplementation = IItemKind(state.getImplementation(slotContents[i]));
            if (address(itemImplementation) != address(0)) {
                itemImplementation.onSpawn(game, state.getOwner(zone), zone, slotContents[i], slotBalances[i]);
            }
        }
        {
            _requireIsOwnerOrZone(state, ctx, coords[Z]);
            bytes24 tile = Node.Tile(coords[Z], coords[Q], coords[R], coords[S]);
            require(state.getBiome(tile) == BiomeKind.DISCOVERED, "tile must be discovered");
            state.setEquipSlot(tile, equipSlot, bag);
            state.setParent(bag, zone);
            state.removeOwner(bag);
        }
    }

    function _spawnTile(State state, Context calldata ctx, int16 z, int16 q, int16 r, int16 s) private {
        bytes24 zone = Node.Zone(z);
        require(Bounds.isInBounds(q, r, s), "coords out of bounds");
        _requireIsOwnerOrZone(state, ctx, z);
        bytes24 tile = Node.Tile(z, q, r, s);
        state.setParent(tile, zone);
        state.setBiome(tile, BiomeKind.DISCOVERED);
        state.setTileAtomValues(tile, [uint64(255), uint64(255), uint64(255)]);
    }

    function _assignAutoQuest(State state, Context calldata ctx, string memory name, int16 zone) private {
        bytes24 nZone = Node.Zone(zone);
        _requireIsOwnerOrZone(state, ctx, zone);
        bytes24 quest = Node.Quest(zone, name);
        state.setParent(quest, nZone);
    }

    function _destroyAutoQuest(State state, Context calldata ctx, string memory name, int16 zone) private {
        _requireIsOwnerOrZone(state, ctx, zone);
        bytes24 quest = Node.Quest(zone, name);
        state.removeParent(quest);
    }

    // allow constructing a building without any materials
    function _construct(
        State state,
        Context calldata ctx,
        bytes24 buildingKind,
        int16 z,
        int16 q,
        int16 r,
        int16 s,
        FacingDirectionKind facingDirection
    ) internal {
        bytes24 zone = Node.Zone(z);
        require(Bounds.isInBounds(q, r, s), "coords out of bounds");
        _requireIsOwnerOrZone(state, ctx, z);
        bytes24 buildingInstance = Node.Building(z, q, r, s);

        state.setBuildingKind(buildingInstance, buildingKind);
        state.setParent(buildingInstance, zone);
        state.setOwner(buildingInstance, Node.Player(msg.sender));
        state.setFixedLocation(buildingInstance, Node.Tile(z, q, r, s));

        // Attach the inputs/output bags
        bytes24 inputBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance, "input")))));
        bytes24 outputBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance, "output")))));
        state.setEquipSlot(buildingInstance, 0, inputBag);
        state.setEquipSlot(buildingInstance, 1, outputBag);
        state.setFacingDirection(buildingInstance, facingDirection);

        // Category specific calls
        ( /*uint64 id*/ , BuildingCategory category) = state.getBuildingKindInfo(buildingKind);

        if (category == BuildingCategory.EXTRACTOR) {
            // Set initial extraction timestamp and reservoir
            _setInitialExtractorData(state, buildingInstance, ctx.clock);
        }
    }

    function _setInitialExtractorData(State state, bytes24 buildingInstance, uint64 timestamp) private {
        state.setBlockNum(buildingInstance, uint8(BuildingBlockNumKey.EXTRACTION), timestamp);
        state.setBuildingReservoirAtoms(buildingInstance, [uint64(499), uint64(499), uint64(499)]);
    }

    function _destroyBag(
        State state,
        Context calldata ctx,
        bytes24 bag,
        address owner,
        bytes24 equipee,
        uint8 equipSlot,
        bytes24[] memory slotContents
    ) private {
        require(bytes4(equipee) == Kind.Tile.selector, "tile bags only");

        (int16 z, int16 q, int16 r, int16 s) = state.getTileCoords(equipee);
        require(Bounds.isInBounds(q, r, s), "coords out of bounds");

        _requireIsOwnerOrZone(state, ctx, z);

        for (uint8 i = 0; i < slotContents.length; i++) {
            state.clearItemSlot(bag, i);
        }
        if (owner != address(0)) {
            state.removeOwner(bag);
        }
        state.removeEquipSlot(equipee, equipSlot);
        state.removeParent(bag);
    }

    function _destroyTile(State state, Context calldata ctx, int16 z, int16 q, int16 r, int16 s) private {
        require(Bounds.isInBounds(q, r, s), "coords out of bounds");
        _requireIsOwnerOrZone(state, ctx, z);

        bytes24 tile = Node.Tile(z, q, r, s);
        state.removeBiome(tile);
        state.removeParent(tile);
    }

    function _destroyBuilding(State state, Context calldata ctx, int16 z, int16 q, int16 r, int16 s) private {
        require(Bounds.isInBounds(q, r, s), "coords out of bounds");
        _requireIsOwnerOrZone(state, ctx, z);

        bytes24 buildingInstance = Node.Building(z, q, r, s);
        // bytes24 buildingKind = state.getBuildingKind(buildingInstance);
        state.removeBuildingKind(buildingInstance);
        state.removeOwner(buildingInstance);
        state.removeParent(buildingInstance);
        state.removeFixedLocation(buildingInstance);

        // NOTE: There are two places where buildings can be destroyed. CheatsRule and CombatRule
        // TODO: Maybe this shouldn't call the hook because it's a dev action
        // Call into the zone kind
        // {
        //     bytes24 zone = Node.Zone(z);
        //     if (zone != bytes24(0)) {
        //         IZoneKind zoneImplementation = IZoneKind(state.getImplementation(zone));
        //         if (address(zoneImplementation) != address(0)) {
        //             zoneImplementation.onDestroyBuilding(game, zone, buildingInstance, buildingKind);
        //         }
        //     }
        // }
    }

    function _requireIsOwnerOrZone(State state, Context calldata ctx, int16 zoneKey) internal view {
        // zone implementations are allowed to call the owner functions
        bytes24 zone = Node.Zone(zoneKey);
        address impl = state.getImplementation(zone);
        if (ctx.sender != impl) {
            require(state.getOwner(zone) == Node.Player(ctx.sender), "owner only");
        }
    }
}
