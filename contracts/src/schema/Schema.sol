// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State, CompoundKeyEncoder, CompoundKeyDecoder} from "cog/IState.sol";
import {BiomeKind, FacingDirectionKind} from "@ds/actions/Actions.sol";

interface Rel {
    function Owner() external;
    function Location() external;
    function Biome() external;
    function FacingDirection() external;
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
    function CombatAttacker() external;
    function CombatDefender() external;
    function IsFinalised() external;
    function HasTask() external;
    function HasQuest() external;
    function ID() external;
    function HasBlockNum() external;
    function Parent() external;
}

interface Kind {
    function ClientPlugin() external;
    function Extension() external;
    function Player() external;
    function ZonedPlayer() external;
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
    function OwnedToken() external;
    function Zone() external;
    function GameSettings() external;
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
    CUSTOM,
    DISPLAY,
    BILLBOARD
}

enum QuestStatus {
    NONE,
    ACCEPTED,
    COMPLETED
}

enum TaskKind {
    NONE,
    COORD,
    INVENTORY,
    MESSAGE,
    QUEST_ACCEPT,
    QUEST_COMPLETE,
    COMBAT,
    CONSTRUCT,
    UNIT_STATS,
    DEPLOY_BUILDING
}

enum BuildingBlockNumKey {
    CONSTRUCTION,
    EXTRACTION
}

enum CombatSideKey {
    ATTACK,
    DEFENCE
}

library Node {
    function ClientPlugin(uint160 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.BYTES(Kind.ClientPlugin.selector, bytes20(uint160(id)));
    }

    function MobileUnit(address addr) internal pure returns (bytes24) {
        return CompoundKeyEncoder.ADDRESS(Kind.MobileUnit.selector, addr);
    }

    function Bag(uint64 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.UINT64(Kind.Bag.selector, id);
    }

    function Zone(int16 id) internal pure returns (bytes24) {
        require(id >= 0, "InvalidZoneID");
        return CompoundKeyEncoder.UINT64(Kind.Zone.selector, uint16(id));
    }

    function Zone(uint256 id) internal pure returns (bytes24) {
        return Zone(int16(uint16(id)));
    }

    function Tile(int16 z, int16 q, int16 r, int16 s) internal pure returns (bytes24) {
        require((q + r + s) == 0, "InvalidTileCoords");
        return CompoundKeyEncoder.INT16_ARRAY(Kind.Tile.selector, [z, q, r, s]);
    }

    function Item(string memory name, uint32[3] memory atoms, bool isStackable) internal pure returns (bytes24) {
        uint32 uniqueID = uint32(uint256(keccak256(abi.encodePacked("item/", name))));
        return Item(uniqueID, atoms, isStackable);
    }

    function Item(uint32 uniqueID, uint32[3] memory atoms, bool isStackable) internal pure returns (bytes24) {
        uint32 stackable = isStackable ? 1 : 0;
        return bytes24(
            abi.encodePacked(Kind.Item.selector, uniqueID, stackable, atoms[GOO_GREEN], atoms[GOO_BLUE], atoms[GOO_RED])
        );
    }

    function OwnedToken(uint256 tokenId, bytes24 playerId) internal pure returns (bytes24) {
        return
            CompoundKeyEncoder.BYTES(Kind.OwnedToken.selector, bytes20(keccak256(abi.encodePacked(tokenId, playerId))));
    }

    function Player(address addr) internal pure returns (bytes24) {
        return CompoundKeyEncoder.ADDRESS(Kind.Player.selector, addr);
    }

    function ZonedPlayer(int16 zone, address addr) internal pure returns (bytes24) {
        return CompoundKeyEncoder.UINT64(
            Kind.ZonedPlayer.selector, uint64(uint256(keccak256(abi.encodePacked(zone, addr))))
        );
    }

    function BuildingKind(uint64 id, BuildingCategory category) internal pure returns (bytes24) {
        return CompoundKeyEncoder.BYTES(
            Kind.BuildingKind.selector, bytes20(abi.encodePacked(uint32(0), id, uint64(category)))
        );
    }

    function BuildingKind(uint64 id) internal pure returns (bytes24) {
        return CompoundKeyEncoder.BYTES(
            Kind.BuildingKind.selector, bytes20(abi.encodePacked(uint32(0), id, uint64(BuildingCategory.NONE)))
        );
    }

    function Extension(address addr) internal pure returns (bytes24) {
        return CompoundKeyEncoder.ADDRESS(Kind.Extension.selector, addr);
    }

    function Building(int16 z, int16 q, int16 r, int16 s) internal pure returns (bytes24) {
        return CompoundKeyEncoder.INT16_ARRAY(Kind.Building.selector, [z, q, r, s]);
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

    function Task(int16 zone, string memory name, TaskKind kind) internal pure returns (bytes24) {
        uint64 nameHash = uint64(uint256(keccak256(abi.encodePacked("task/", name))));
        return CompoundKeyEncoder.BYTES(
            Kind.Task.selector,
            bytes20(abi.encodePacked(uint32(uint16(zone)), uint32(0), uint32(uint8(kind)), nameHash))
        );
    }

    function Quest(int16 zone, string memory name) internal pure returns (bytes24) {
        uint64 id = uint64(uint256(keccak256(abi.encodePacked("quest/", name))));
        return CompoundKeyEncoder.BYTES(
            Kind.Quest.selector, bytes20(abi.encodePacked(uint32(uint16(zone)), uint64(0), id))
        );
    }

    function GameSettings() internal pure returns (bytes24) {
        return bytes24(Kind.GameSettings.selector);
    }
}

uint8 constant Q = 1;
uint8 constant R = 2;
uint8 constant S = 3;
uint8 constant Z = 0;
int16 constant TRAVEL_SPEED = 10; // 10 == 1 tile per block

using Schema for State;

library Schema {
    function setFixedLocation(State state, bytes24 node, bytes24 tile) internal {
        return state.set(Rel.Location.selector, uint8(LocationKey.FIXED), node, tile, 0);
    }

    function removeFixedLocation(State state, bytes24 node) internal {
        return state.remove(Rel.Location.selector, uint8(LocationKey.FIXED), node);
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

    function removeBiome(State state, bytes24 node) internal {
        return state.remove(Rel.Biome.selector, 0x0, node);
    }

    function getBiome(State state, bytes24 node) internal view returns (BiomeKind) {
        (, uint160 biome) = state.get(Rel.Biome.selector, 0x0, node);
        return BiomeKind(uint8(biome));
    }

    function setFacingDirection(State state, bytes24 node, FacingDirectionKind facingDirection) internal {
        return state.set(Rel.FacingDirection.selector, 0x0, node, 0x0, uint64(facingDirection));
    }

    function getFacingDirection(State state, bytes24 node) internal view returns (FacingDirectionKind) {
        (, uint160 facingDirection) = state.get(Rel.FacingDirection.selector, 0x0, node);
        return FacingDirectionKind(uint8(facingDirection));
    }

    function setOwner(State state, bytes24 node, bytes24 ownerNode) internal {
        return state.set(Rel.Owner.selector, 0x0, node, ownerNode, 0);
    }

    function setParent(State state, bytes24 node, bytes24 parentNode) internal {
        return state.set(Rel.Parent.selector, 0x0, node, parentNode, 0);
    }

    function removeParent(State state, bytes24 node) internal {
        return state.remove(Rel.Parent.selector, 0x0, node);
    }

    function getParent(State state, bytes24 node) internal view returns (bytes24) {
        (bytes24 parent,) = state.get(Rel.Parent.selector, 0x0, node);
        return parent;
    }

    function removeOwner(State state, bytes24 node) internal {
        return state.remove(Rel.Owner.selector, 0x0, node);
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

    function removeEquipSlot(State state, bytes24 equipee, uint8 equipSlot) internal {
        return state.remove(Rel.Equip.selector, equipSlot, equipee);
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

    function removeBuildingKind(State state, bytes24 buildingInstance) internal {
        return state.remove(Rel.Is.selector, 0x0, buildingInstance);
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
        category = BuildingCategory(uint64(uint192(buildingKind) & type(uint64).max));
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
        return state.set(Rel.HasBlockNum.selector, slot, kind, Node.BlockNum(), blockNum);
    }

    function getBlockNum(State state, bytes24 kind, uint8 slot) internal view returns (uint64 blockNum) {
        ( /*bytes24 item*/ , blockNum) = state.get(Rel.HasBlockNum.selector, slot, kind);
    }

    function setBuildingConstructionBlockNum(State state, bytes24 buildingID, uint64 blockNum) internal {
        state.setBlockNum(buildingID, uint8(BuildingBlockNumKey.CONSTRUCTION), blockNum);
    }

    function getBuildingConstructionBlockNum(State state, bytes24 buildingID) internal view returns (uint64) {
        return state.getBlockNum(buildingID, uint8(BuildingBlockNumKey.CONSTRUCTION));
    }

    function setZonedPlayerQuest(
        State state,
        bytes24 quest,
        int16 zone,
        address player,
        uint8 questNum,
        QuestStatus status
    ) internal {
        bytes24 zonedPlayer = Node.ZonedPlayer(zone, player);
        state.setParent(zonedPlayer, Node.Zone(zone));
        state.setOwner(zonedPlayer, Node.Player(player));
        state.set(Rel.HasQuest.selector, questNum, zonedPlayer, quest, uint8(status));
    }

    function getZonedPlayerQuest(State state, int16 zone, address player, uint8 questNum)
        internal
        view
        returns (bytes24, QuestStatus)
    {
        bytes24 zonedPlayer = Node.ZonedPlayer(zone, player);
        (bytes24 quest, uint64 status) = state.get(Rel.HasQuest.selector, questNum, zonedPlayer);
        return (quest, QuestStatus(status));
    }

    function setData(State state, bytes24 nodeID, string memory key, bool data) internal {
        state.setData(nodeID, key, bytes32(uint256(data ? 1 : 0)));
    }

    function setData(State state, bytes24 nodeID, string memory key, uint256 data) internal {
        state.setData(nodeID, key, bytes32(uint256(data)));
    }

    function getDataBool(State state, bytes24 nodeID, string memory key) external view returns (bool) {
        return uint256(state.getData(nodeID, key)) == 1;
    }

    function getDataUint256(State state, bytes24 nodeID, string memory key) external view returns (uint256) {
        return uint256(state.getData(nodeID, key));
    }

    function getDataString(State state, bytes24 nodeID, string memory key) external view returns (string memory) {
        bytes32 b = state.getData(nodeID, key);
        uint8 i = 0;
        while (i < 32 && b[i] != 0) {
            i++;
        }
        bytes memory nonNullBytes = new bytes(i);
        for (i = 0; i < 32 && b[i] != 0; i++) {
            nonNullBytes[i] = b[i];
        }
        return string(nonNullBytes);
    }

    function getAttacker(State state, bytes24 sessionID, uint8 index) external view returns (bytes24) {
        (bytes24 unitID, /*uint64 blockNum*/ ) = state.get(Rel.CombatAttacker.selector, index, sessionID);
        return unitID;
    }

    function setAttacker(State state, bytes24 sessionID, uint8 index, bytes24 unitID, uint64 blockNum) external {
        state.set(Rel.CombatAttacker.selector, index, sessionID, unitID, blockNum);
    }

    function getDefender(State state, bytes24 sessionID, uint8 index) external view returns (bytes24) {
        (bytes24 unitID, /*uint64 blockNum*/ ) = state.get(Rel.CombatDefender.selector, index, sessionID);
        return unitID;
    }

    function setDefender(State state, bytes24 sessionID, uint8 index, bytes24 unitID, uint64 blockNum) external {
        state.set(Rel.CombatDefender.selector, index, sessionID, unitID, blockNum);
    }

    function getAttackTile(State state, bytes24 sessionID) external view returns (bytes24 tileID, uint64 startBlock) {
        return state.get(Rel.Has.selector, uint8(CombatSideKey.ATTACK), sessionID);
    }

    function getTileCoords(State, /*state*/ bytes24 tile) external pure returns (int16 z, int16 q, int16 r, int16 s) {
        int16[4] memory keys = CompoundKeyDecoder.INT16_ARRAY(tile);
        return (keys[0], keys[1], keys[2], keys[3]);
    }

    function getTileZone(State, /*state*/ bytes24 tile) external pure returns (int16 z) {
        int16[4] memory keys = CompoundKeyDecoder.INT16_ARRAY(tile);
        return (keys[0]);
    }

    function setZoneUnitLimit(State state, uint64 limit) internal {
        state.setData(Node.GameSettings(), "zoneUnitLimit", bytes32(uint256(limit)));
    }

    function getZoneUnitLimit(State state) internal view returns (uint64) {
        return uint64(uint256(state.getData(Node.GameSettings(), "zoneUnitLimit")));
    }

    function setUnitTimeoutBlocks(State state, uint64 blocks) internal {
        state.setData(Node.GameSettings(), "unitTimeoutBlocks", bytes32(uint256(blocks)));
    }

    function getUnitTimeoutBlocks(State state) internal view returns (uint64) {
        return uint64(uint256(state.getData(Node.GameSettings(), "unitTimeoutBlocks")));
    }
}
