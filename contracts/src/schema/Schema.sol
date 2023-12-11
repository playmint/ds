// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State, CompoundKeyEncoder, CompoundKeyDecoder} from "cog/IState.sol";
import {BiomeKind} from "@ds/actions/Actions.sol";

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
    function Has() external;
    function Combat() external;
    function IsFinalised() external;
    function HasTask() external;
    function HasQuest() external;
    function ID() external;
    function GooPipe() external;
    function LogicCellTrigger() external;
}

interface Kind {
    function ClientPlugin() external;
    function Extension() external;
    function Player() external;
    function MobileUnit() external;
    function Bag() external;
    function Tile() external;
    function BuildingKind() external;
    function Building() external;
    function Atom() external;
    function Item() external;
    function CombatSession() external;
    function Hash() external;
    function BlockNum() external;
    function Quest() external;
    function Task() external;
    function ID() external;
    function ConnectionCount() external;
}

uint64 constant BLOCK_TIME_SECS = 2;

uint8 constant GOO_GREEN = 0;
uint8 constant GOO_BLUE = 1;
uint8 constant GOO_RED = 2;
uint8 constant LIFE = GOO_GREEN;
uint8 constant DEFENCE = GOO_BLUE;
uint8 constant ATTACK = GOO_RED;

uint32 constant UNIT_BASE_LIFE = 50;
uint32 constant UNIT_BASE_DEFENCE = 23;
uint32 constant UNIT_BASE_ATTACK = 30;
uint32 constant LIFE_MUL = 10;

enum LocationKey {
    PREV,
    NEXT,
    FIXED
}

enum BuildingCategory {
    NONE,
    BLOCKER,
    EXTRACTOR,
    ITEM_FACTORY,
    CUSTOM
}

enum LogicCellKind {
    NONE,
    START,
    LIQUIFY,
    SOLIDIFY,
    ADD,
    SUBTRACT,
    DIVIDE,
    REFINE,
    RESERVE,
    BUFFER
}

enum QuestStatus {
    NONE,
    ACCEPTED,
    COMPLETED
}

struct GooVal {
    uint64 r;
    uint64 g;
    uint64 b;
}

struct LogicCellState {
    bytes24 logicCell;
    uint8 inputCount;
    uint8 filledInputCount;
    GooVal[] input;
}

int16 constant DEFAULT_ZONE = 0;

library Node {
    function ClientPlugin(uint160 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.BYTES(Kind.ClientPlugin.selector, bytes20(uint160(id)));
    }

    function MobileUnit(uint64 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.UINT64(Kind.MobileUnit.selector, id);
    }

    function Bag(uint64 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.UINT64(Kind.Bag.selector, id);
    }

    function Tile(int16 zone, int16 q, int16 r, int16 s) internal pure returns (bytes24) {
        require((q + r + s) == 0, "InvalidTileCoords");
        return CompoundKeyEncoder.INT16_ARRAY(Kind.Tile.selector, [zone, q, r, s]);
    }

    function Item(uint32[3] memory atoms, bool isStackable) internal pure returns (bytes24) {
        uint32 uniqueID = uint32(uint256(keccak256(abi.encode(atoms, isStackable))));
        return Item(uniqueID, atoms, isStackable);
    }

    function Item(uint32 uniqueID, uint32[3] memory atoms, bool isStackable) internal pure returns (bytes24) {
        uint32 stackable = 0;
        if (isStackable) {
            stackable = 1;
        }
        return bytes24(
            abi.encodePacked(Kind.Item.selector, uniqueID, stackable, atoms[GOO_GREEN], atoms[GOO_BLUE], atoms[GOO_RED])
        );
    }

    function Player(address addr) internal pure returns (bytes24) {
        return CompoundKeyEncoder.ADDRESS(Kind.Player.selector, addr);
    }

    function BuildingKind(uint64 id, BuildingCategory category, LogicCellKind logicCellKind)
        internal
        pure
        returns (bytes24)
    {
        return CompoundKeyEncoder.BYTES(
            Kind.BuildingKind.selector,
            bytes20(abi.encodePacked(uint32(0), id, uint32(logicCellKind), uint32(category)))
        );
    }

    function BuildingKind(uint64 id, BuildingCategory category) internal pure returns (bytes24) {
        return CompoundKeyEncoder.BYTES(
            Kind.BuildingKind.selector, bytes20(abi.encodePacked(uint32(0), id, uint32(0), uint32(category)))
        );
    }

    function BuildingKind(uint64 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.BYTES(
            Kind.BuildingKind.selector,
            bytes20(abi.encodePacked(uint32(0), id, uint32(0), uint32(BuildingCategory.NONE)))
        );
    }

    function Extension(address addr) internal pure returns (bytes24) {
        return CompoundKeyEncoder.ADDRESS(Kind.Extension.selector, addr);
    }

    function Building(int16 zone, int16 q, int16 r, int16 s) internal pure returns (bytes24) {
        return CompoundKeyEncoder.INT16_ARRAY(Kind.Building.selector, [zone, q, r, s]);
    }

    function CombatSession(uint64 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.UINT64(Kind.CombatSession.selector, id);
    }

    function Hash(bytes20 hash) internal pure returns (bytes24) {
        return CompoundKeyEncoder.BYTES(Kind.Hash.selector, hash);
    }

    function ID(bytes20 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.BYTES(Kind.Hash.selector, id);
    }

    function RewardBag(bytes24 sessionID, bytes24 entityID) internal pure returns (bytes24) {
        return Node.Bag(uint64(uint16(uint192(sessionID) & type(uint16).max) | (uint48(uint192(entityID)) << 16)));
    }

    function Atom(uint64 atomType) internal pure returns (bytes24) {
        return CompoundKeyEncoder.UINT64(Kind.Atom.selector, atomType);
    }

    function BlockNum() internal pure returns (bytes24) {
        return bytes24(Kind.BlockNum.selector);
    }

    function Task(uint32 id, string memory kind) internal pure returns (bytes24) {
        uint32 kindHash = uint32(uint256(keccak256(abi.encode(kind))));
        return CompoundKeyEncoder.BYTES(
            Kind.Task.selector, bytes20(abi.encodePacked(uint32(0), uint32(0), uint32(0), kindHash, id))
        );
    }

    function Quest(string memory name) internal pure returns (bytes24) {
        uint64 id = uint64(uint256(keccak256(abi.encodePacked("quest/", name))));
        return CompoundKeyEncoder.BYTES(Kind.Quest.selector, bytes20(abi.encodePacked(uint32(0), uint64(0), id)));
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

    function getCurrentLocation(State state, bytes24 node, uint64 /*atTime*/ ) internal view returns (bytes24) {
        // ---------- TEMP HACK UNTIL CLIENT CAN HANDLE CALC OF CURRENT LOCATION PROPERLY ------------
        return state.getNextLocation(node);
        // ---------- END HACK ----------------
        // (bytes24 nextTile, uint64 arrivalTime) = state.get(Rel.Location.selector, uint8(LocationKey.NEXT), node);
        // if (atTime >= arrivalTime) {
        //     return nextTile;
        // }
        // (bytes24 prevTile, uint64 departureTime) = state.get(Rel.Location.selector, uint8(LocationKey.PREV), node);
        // // is prev/dest same
        // if (nextTile == prevTile || departureTime == atTime) {
        //     return prevTile;
        // }
        // // work out where we are
        // int16 elaspsedTime = int16(int64(atTime) - int64(departureTime));
        // int16 tilesTraveled = (TRAVEL_SPEED / 10 * elaspsedTime);
        // int16[4] memory prevCoords = CompoundKeyDecoder.INT16_ARRAY(prevTile);
        // int16[4] memory nextCoords = CompoundKeyDecoder.INT16_ARRAY(nextTile);
        // int16[4] memory currCoords = prevCoords;
        // if (nextCoords[Q] == prevCoords[Q]) {
        //     if (nextCoords[R] > prevCoords[R]) {
        //         // southeast
        //         currCoords[R] += (tilesTraveled * 1);
        //         currCoords[S] += (tilesTraveled * -1);
        //     } else {
        //         // northwest
        //         currCoords[R] += (tilesTraveled * -1);
        //         currCoords[S] += (tilesTraveled * 1);
        //     }
        // } else if (nextCoords[R] == prevCoords[R]) {
        //     if (nextCoords[S] > prevCoords[S]) {
        //         // east
        //         currCoords[Q] += (tilesTraveled * 1);
        //         currCoords[S] += (tilesTraveled * -1);
        //     } else {
        //         // west
        //         currCoords[Q] += (tilesTraveled * -1);
        //         currCoords[S] += (tilesTraveled * 1);
        //     }
        // } else if (nextCoords[S] == prevCoords[S]) {
        //     if (nextCoords[Q] > prevCoords[Q]) {
        //         // northeast
        //         currCoords[Q] += (tilesTraveled * 1);
        //         currCoords[R] += (tilesTraveled * -1);
        //     } else {
        //         // southwest
        //         currCoords[Q] += (tilesTraveled * -1);
        //         currCoords[R] += (tilesTraveled * 1);
        //     }
        // } else {
        //     // illegal
        //     revert("illegal move");
        // }

        // return Node.Tile(currCoords[0], currCoords[Q], currCoords[R], currCoords[S]);
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

    function getBuildingKindInfo(State, /*state*/ bytes24 buildingKind)
        internal
        pure
        returns (uint64 id, BuildingCategory category)
    {
        id = uint64(uint192(buildingKind) >> 64 & type(uint64).max);
        category = BuildingCategory(uint32(uint192(buildingKind) & type(uint32).max));
    }

    function getItemStructure(State, /*state*/ bytes24 item)
        internal
        pure
        returns (uint32[3] memory atoms, bool isStackable)
    {
        isStackable = uint32(uint192(item) >> 96) == 1;
        atoms[GOO_GREEN] = uint32(uint192(item) >> 64);
        atoms[GOO_BLUE] = uint32(uint192(item) >> 32);
        atoms[GOO_RED] = uint32(uint192(item));
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

    function getHash(State state, bytes24 node, uint8 edgeIndex) internal view returns (bytes20 hash) {
        (bytes24 hashNode,) = state.get(Rel.Has.selector, edgeIndex, node);
        hash = bytes20(uint160(uint192(hashNode) & type(uint160).max));
    }

    function setHash(State state, bytes20 hash, bytes24 node, uint8 edgeIndex) internal {
        state.set(Rel.Has.selector, edgeIndex, node, Node.Hash(hash), 0);
    }

    function getID(State state, bytes24 node) internal view returns (bytes24 id) {
        (id,) = state.get(Rel.ID.selector, 0, node);
    }

    function setID(State state, bytes24 node, bytes24 idNode) internal {
        state.set(Rel.ID.selector, 0, node, idNode, 0);
        state.setOwner(idNode, node);
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

    function getIsFinalised(State state, bytes24 sessionID) internal view returns (bool) {
        ( /*bytes24 sessionNode*/ , uint64 isFinalised) = state.get(Rel.IsFinalised.selector, 0, sessionID);
        return isFinalised > 0;
    }

    function setIsFinalised(State state, bytes24 sessionID, bool isFinalised) internal {
        state.set(Rel.IsFinalised.selector, 0, sessionID, sessionID, isFinalised ? 1 : 0);
    }

    function getSid(State, /*state*/ bytes24 mobileUnitID) internal pure returns (uint32) {
        // NOTE: This is intentional. Where 'sid' is reauired by actions, it is typed as uint32
        return uint32(CompoundKeyDecoder.UINT64(mobileUnitID));
    }

    function setTileAtomValues(State state, bytes24 tile, uint64[3] memory atoms) internal {
        state.set(Rel.Balance.selector, GOO_GREEN, tile, Node.Atom(GOO_GREEN), atoms[GOO_GREEN]);
        state.set(Rel.Balance.selector, GOO_BLUE, tile, Node.Atom(GOO_BLUE), atoms[GOO_BLUE]);
        state.set(Rel.Balance.selector, GOO_RED, tile, Node.Atom(GOO_RED), atoms[GOO_RED]);
    }

    function getTileAtomValues(State state, bytes24 tile) internal view returns (uint64[3] memory atoms) {
        uint64 atomVal;

        ( /*bytes24*/ , atomVal) = state.get(Rel.Balance.selector, GOO_GREEN, tile);
        atoms[GOO_GREEN] = atomVal;

        ( /*bytes24*/ , atomVal) = state.get(Rel.Balance.selector, GOO_BLUE, tile);
        atoms[GOO_BLUE] = atomVal;

        ( /*bytes24*/ , atomVal) = state.get(Rel.Balance.selector, GOO_RED, tile);
        atoms[GOO_RED] = atomVal;
    }

    function setBuildingReservoirAtoms(State state, bytes24 buildingInstance, uint64[3] memory atoms) internal {
        state.set(Rel.Balance.selector, GOO_GREEN, buildingInstance, Node.Atom(GOO_GREEN), atoms[GOO_GREEN]);
        state.set(Rel.Balance.selector, GOO_BLUE, buildingInstance, Node.Atom(GOO_BLUE), atoms[GOO_BLUE]);
        state.set(Rel.Balance.selector, GOO_RED, buildingInstance, Node.Atom(GOO_RED), atoms[GOO_RED]);
    }

    function getBuildingReservoirAtoms(State state, bytes24 buildingInstance)
        internal
        view
        returns (uint64[3] memory atoms)
    {
        uint64 atomVal;

        ( /*bytes24*/ , atomVal) = state.get(Rel.Balance.selector, GOO_GREEN, buildingInstance);
        atoms[GOO_GREEN] = atomVal;

        ( /*bytes24*/ , atomVal) = state.get(Rel.Balance.selector, GOO_BLUE, buildingInstance);
        atoms[GOO_BLUE] = atomVal;

        ( /*bytes24*/ , atomVal) = state.get(Rel.Balance.selector, GOO_RED, buildingInstance);
        atoms[GOO_RED] = atomVal;
    }

    function setBlockNum(State state, bytes24 kind, uint8 slot, uint64 blockNum) internal {
        // TODO: don't use generic `Has` selector as it could conflict with something else
        return state.set(Rel.Has.selector, slot, kind, Node.BlockNum(), blockNum);
    }

    function getBlockNum(State state, bytes24 kind, uint8 slot) internal view returns (uint64 blockNum) {
        ( /*bytes24 item*/ , blockNum) = state.get(Rel.Has.selector, slot, kind);
    }

    function getTaskKind(State, /*state*/ bytes24 task) internal pure returns (uint32) {
        return uint32(uint192(task) >> 32 & type(uint32).max);
    }

    function setQuestAccepted(State state, bytes24 quest, bytes24 player, uint8 questNum) internal {
        state.set(Rel.HasQuest.selector, questNum, player, quest, uint8(QuestStatus.ACCEPTED));
    }

    function setQuestCompleted(State state, bytes24 quest, bytes24 player, uint8 questNum) internal {
        state.set(Rel.HasQuest.selector, questNum, player, quest, uint8(QuestStatus.COMPLETED));
    }

    function getPlayerQuest(State state, bytes24 player, uint8 questNum) internal view returns (bytes24, QuestStatus) {
        (bytes24 quest, uint64 status) = state.get(Rel.HasQuest.selector, questNum, player);
        return (quest, QuestStatus(status));
    }
}
