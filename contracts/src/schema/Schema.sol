// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State, CompoundKeyEncoder, CompoundKeyDecoder} from "cog/State.sol";

interface Rel {
    function Owner() external;
    function Location() external;
    function Biome() external;
    function Balance() external;
    function Equip() external;
    function Is() external;
    function Supports() external;
    function Implementation() external;
    function Material() external;
    function Input() external;
    function Output() external;
}

interface Kind {
    function ClientPlugin() external;
    function Extension() external;
    function Player() external;
    function Seeker() external;
    function Bag() external;
    function Tile() external;
    function BuildingKind() external;
    function Building() external;
    function Atom() external;
    function Item() external;
}

uint8 constant ATOM_LIFE = 0;
uint8 constant ATOM_DEFENSE = 1;
uint8 constant ATOM_ATTACK = 2;

enum BiomeKind {
    UNDISCOVERED,
    DISCOVERED
}

enum LocationKey {
    PREV,
    NEXT,
    FIXED
}

int16 constant DEFAULT_ZONE = 0;

library Node {
    function ClientPlugin(uint160 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.BYTES(Kind.ClientPlugin.selector, bytes20(uint160(id)));
    }

    function Seeker(uint64 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.UINT64(Kind.Seeker.selector, id);
    }

    function Bag(uint64 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.UINT64(Kind.Bag.selector, id);
    }

    function Tile(int16 zone, int16 q, int16 r, int16 s) internal pure returns (bytes24) {
        return CompoundKeyEncoder.INT16_ARRAY(Kind.Tile.selector, [zone, q, r, s]);
    }

    function Item(string memory name, uint32[3] memory atoms, bool isStackable) internal pure returns (bytes24) {
        uint32 uniqueID = uint32(uint256(keccak256(abi.encode(name, atoms, isStackable))));
        uint32 stackable = 0;
        if (isStackable) {
            stackable = 1;
        }
        return bytes24(
            abi.encodePacked(
                Kind.Item.selector, uniqueID, stackable, atoms[ATOM_LIFE], atoms[ATOM_DEFENSE], atoms[ATOM_ATTACK]
            )
        );
    }

    function Player(address addr) internal pure returns (bytes24) {
        return CompoundKeyEncoder.ADDRESS(Kind.Player.selector, addr);
    }

    function BuildingKind(uint64 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.UINT64(Kind.BuildingKind.selector, id);
    }

    function Extension(address addr) internal pure returns (bytes24) {
        return CompoundKeyEncoder.ADDRESS(Kind.Extension.selector, addr);
    }

    function Building(int16 zone, int16 q, int16 r, int16 s) internal pure returns (bytes24) {
        return CompoundKeyEncoder.INT16_ARRAY(Kind.Building.selector, [zone, q, r, s]);
    }
}

uint8 constant Q = 1;
uint8 constant R = 2;
uint8 constant S = 3;
int16 constant TRAVEL_SPEED = 10; // 10 == 1 tile per block

using Schema for State;

library Schema {
    function setFixedLocation(State state, bytes24 node, bytes24 tile) internal {
        return state.set(Rel.Location.selector, uint8(LocationKey.FIXED), node, tile, 0);
    }

    function setNextLocation(State state, bytes24 node, bytes24 tile, uint64 arrivalTime) internal {
        return state.set(Rel.Location.selector, uint8(LocationKey.NEXT), node, tile, arrivalTime);
    }

    function setPrevLocation(State state, bytes24 node, bytes24 tile, uint64 departureTime) internal {
        return state.set(Rel.Location.selector, uint8(LocationKey.PREV), node, tile, departureTime);
    }

    function getFixedLocation(State state, bytes24 node) internal view returns (bytes24) {
        (bytes24 tile,) = state.get(Rel.Location.selector, uint8(LocationKey.FIXED), node);
        return tile;
    }

    function getNextLocation(State state, bytes24 node) internal view returns (bytes24) {
        (bytes24 tile,) = state.get(Rel.Location.selector, uint8(LocationKey.NEXT), node);
        return tile;
    }

    function getPrevLocation(State state, bytes24 node) internal view returns (bytes24) {
        (bytes24 tile,) = state.get(Rel.Location.selector, uint8(LocationKey.PREV), node);
        return tile;
    }

    function getCurrentLocation(State state, bytes24 node, uint64 atTime) internal view returns (bytes24) {
        (bytes24 nextTile, uint64 arrivalTime) = state.get(Rel.Location.selector, uint8(LocationKey.NEXT), node);
        if (atTime >= arrivalTime) {
            return nextTile;
        }
        (bytes24 prevTile, uint64 departureTime) = state.get(Rel.Location.selector, uint8(LocationKey.PREV), node);
        // is prev/dest same
        if (nextTile == prevTile || departureTime == atTime) {
            return prevTile;
        }
        // work out where we are
        int16 elaspsedTime = int16(int64(atTime) - int64(departureTime));
        int16 tilesTraveled = (TRAVEL_SPEED / 10 * elaspsedTime);
        int16[4] memory prevCoords = CompoundKeyDecoder.INT16_ARRAY(prevTile);
        int16[4] memory nextCoords = CompoundKeyDecoder.INT16_ARRAY(nextTile);
        int16[4] memory currCoords = prevCoords;
        if (nextCoords[Q] == prevCoords[Q]) {
            if (nextCoords[R] > prevCoords[R]) {
                // southeast
                currCoords[R] += (tilesTraveled * 1);
                currCoords[S] += (tilesTraveled * -1);
            } else {
                // northwest
                currCoords[R] += (tilesTraveled * -1);
                currCoords[S] += (tilesTraveled * 1);
            }
        } else if (nextCoords[R] == prevCoords[R]) {
            if (nextCoords[S] > prevCoords[S]) {
                // east
                currCoords[Q] += (tilesTraveled * 1);
                currCoords[S] += (tilesTraveled * -1);
            } else {
                // west
                currCoords[Q] += (tilesTraveled * -1);
                currCoords[S] += (tilesTraveled * 1);
            }
        } else if (nextCoords[S] == prevCoords[S]) {
            if (nextCoords[Q] > prevCoords[Q]) {
                // northeast
                currCoords[Q] += (tilesTraveled * 1);
                currCoords[R] += (tilesTraveled * -1);
            } else {
                // southwest
                currCoords[Q] += (tilesTraveled * -1);
                currCoords[R] += (tilesTraveled * 1);
            }
        } else {
            // illegal
            revert("illegal move");
        }

        return Node.Tile(currCoords[0], currCoords[Q], currCoords[R], currCoords[S]);
    }

    function setBiome(State state, bytes24 node, BiomeKind biome) internal {
        return state.set(Rel.Biome.selector, 0x0, node, 0x0, uint64(biome));
    }

    function getBiome(State state, bytes24 node) internal view returns (BiomeKind) {
        (, uint160 biome) = state.get(Rel.Biome.selector, 0x0, node);
        return BiomeKind(uint8(biome));
    }

    function setOwner(State state, bytes24 node, bytes24 ownerNode) internal {
        return state.set(Rel.Owner.selector, 0x0, node, ownerNode, 0);
    }

    function getOwner(State state, bytes24 node) internal view returns (bytes24) {
        (bytes24 owner,) = state.get(Rel.Owner.selector, 0x0, node);
        return owner;
    }

    function getOwnerAddress(State state, bytes24 ownerNode) internal view returns (address) {
        while (bytes4(ownerNode) != Kind.Player.selector) {
            ownerNode = state.getOwner(ownerNode);
        }
        return address(uint160(uint192(ownerNode)));
    }

    function setItemSlot(State state, bytes24 bag, uint8 slot, bytes24 resource, uint64 balance) internal {
        return state.set(Rel.Balance.selector, slot, bag, resource, balance);
    }

    function clearItemSlot(State state, bytes24 bag, uint8 slot) internal {
        return state.remove(Rel.Balance.selector, slot, bag);
    }

    function getItemSlot(State state, bytes24 bag, uint8 slot)
        internal
        view
        returns (bytes24 resource, uint64 balance)
    {
        return state.get(Rel.Balance.selector, slot, bag);
    }

    function setEquipSlot(State state, bytes24 equipee, uint8 equipSlot, bytes24 equipment) internal {
        return state.set(Rel.Equip.selector, equipSlot, equipee, equipment, 1);
    }

    function getEquipSlot(State state, bytes24 equipee, uint8 equipSlot) internal view returns (bytes24 equipedThing) {
        (bytes24 thing,) = state.get(Rel.Equip.selector, equipSlot, equipee);
        return thing;
    }

    function setImplementation(State state, bytes24 customizableThing, address contractAddr) internal {
        return state.set(Rel.Implementation.selector, 0x0, customizableThing, Node.Extension(contractAddr), 0);
    }

    function getImplementation(State state, bytes24 customizableThing) internal view returns (address) {
        (bytes24 contractNode,) = state.get(Rel.Implementation.selector, 0x0, customizableThing);
        return address(uint160(uint192(contractNode)));
    }

    function setBuildingKind(State state, bytes24 buildingInstance, bytes24 buildingKind) internal {
        return state.set(Rel.Is.selector, 0x0, buildingInstance, buildingKind, 0);
    }

    function getBuildingKind(State state, bytes24 buildingInstance) internal view returns (bytes24) {
        (bytes24 kind,) = state.get(Rel.Is.selector, 0x0, buildingInstance);
        return kind;
    }

    function getItemStructure(State, /*state*/ bytes24 item)
        internal
        pure
        returns (uint32[3] memory atoms, bool isStackable)
    {
        isStackable = uint32(uint192(item) >> 96) == 1;
        atoms[ATOM_LIFE] = uint32(uint192(item) >> 64);
        atoms[ATOM_DEFENSE] = uint32(uint192(item) >> 32);
        atoms[ATOM_ATTACK] = uint32(uint192(item));
        return (atoms, isStackable);
    }

    function getAtoms(State state, bytes24 item) internal pure returns (uint32[3] memory atoms) {
        (atoms,) = getItemStructure(state, item);
        return atoms;
    }

    function setPlugin(State state, bytes24 plugin, bytes24 target) internal {
        state.set(Rel.Supports.selector, 0x0, plugin, target, 0);
    }

    function getPlugin(State state, bytes24 node) internal view returns (bytes24) {
        (bytes24 plugin,) = state.get(Rel.Supports.selector, 0x0, node);
        return plugin;
    }

    function setInput(State state, bytes24 kind, uint8 slot, bytes24 item, uint64 qty) internal {
        return state.set(Rel.Input.selector, slot, kind, item, qty);
    }

    function getInput(State state, bytes24 kind, uint8 slot) internal view returns (bytes24 item, uint64 qty) {
        return state.get(Rel.Input.selector, slot, kind);
    }

    function setOutput(State state, bytes24 kind, uint8 slot, bytes24 item, uint64 qty) internal {
        return state.set(Rel.Output.selector, slot, kind, item, qty);
    }

    function getOutput(State state, bytes24 kind, uint8 slot) internal view returns (bytes24 item, uint64 qty) {
        return state.get(Rel.Output.selector, slot, kind);
    }

    function setMaterial(State state, bytes24 kind, uint8 slot, bytes24 item, uint64 qty) internal {
        return state.set(Rel.Material.selector, slot, kind, item, qty);
    }

    function getMaterial(State state, bytes24 kind, uint8 slot) internal view returns (bytes24 item, uint64 qty) {
        return state.get(Rel.Material.selector, slot, kind);
    }
}

library TileUtils {
    function coords(bytes24 tile) internal pure returns (int16[4] memory keys) {
        keys = CompoundKeyDecoder.INT16_ARRAY(tile);
    }

    function distance(bytes24 tileA, bytes24 tileB) internal pure returns (uint256) {
        int16[4] memory a = CompoundKeyDecoder.INT16_ARRAY(tileA);
        int16[4] memory b = CompoundKeyDecoder.INT16_ARRAY(tileB);
        return uint256(
            (abs(int256(a[Q]) - int256(b[Q])) + abs(int256(a[R]) - int256(b[R])) + abs(int256(a[S]) - int256(b[S]))) / 2
        );
    }

    function isDirect(bytes24 tileA, bytes24 tileB) internal pure returns (bool) {
        int16[4] memory a = CompoundKeyDecoder.INT16_ARRAY(tileA);
        int16[4] memory b = CompoundKeyDecoder.INT16_ARRAY(tileB);
        return a[Q] == b[Q] || a[R] == b[R] || a[S] == b[S];
    }

    function abs(int256 n) internal pure returns (int256) {
        return n >= 0 ? n : -n;
    }
}

// temp base "resource" ids used by scouting
// these should not really be special, they are simply
// how we seed the world with atoms at the moment by
// dropping these per-atom resources in bags during scout
library ItemUtils {
    function Kiki() internal pure returns (bytes24) {
        return Node.Item("kiki", [uint32(2), uint32(0), uint32(0)], true);
    }

    function Bouba() internal pure returns (bytes24) {
        return Node.Item("bouba", [uint32(0), uint32(2), uint32(0)], true);
    }

    function Semiote() internal pure returns (bytes24) {
        return Node.Item("semiote", [uint32(0), uint32(0), uint32(2)], true);
    }
}

// TODO: stop duplicating these!
error NoTransferPlayerNotOwner();
error NoTransferNotYourBag();
error NoTransferLowBalance();
error NoTransferIncompatibleSlot();
error NoTransferSameSlot();
error NoTransferUnsupportedEquipeeKind();
error NoTransferNotSameLocation();
error NoTransferEquipItemIsNotBag();
error NoTransferEmptySlot();

library BagUtils {
    function requireEquipeeLocation(State state, bytes24 equipee, bytes24 seeker, bytes24 location, uint64 atTime)
        internal
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
            // The distance method expects a tile so we can swap out the first 4 bytes
            // of the building for a tile selector because the building ID is based on
            // the location the same as a tile.
            bytes24 mask = 0x00000000FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF;
            bytes24 buildingLocation = (equipee & mask) | bytes4(Kind.Tile.selector);
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
}
