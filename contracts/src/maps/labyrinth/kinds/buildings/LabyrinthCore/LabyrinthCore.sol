// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, Kind} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract LabyrinthCore is BuildingKind {
    // for respawn
    bytes24 constant _LARGE_ROCKS = 0xbe92755c0000000000000000bdcf2b5d0000000000000001;
    bytes24 constant _CRUSHER = 0xbe92755c0000000000000000e92c4edd0000000000000001;
    bytes24 constant sword = 0x6a7a67f01df41ea10000000000000001000000010000001e;
    bytes24 constant shield = 0x6a7a67f0ab4f7a160000000000000014000000280000000a;
    bytes24 constant armor = 0x6a7a67f06a60bb99000000000000001e0000001400000001;

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public override {
        // Crafting the Playtest Pass
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));

        // Get location of buildingInstance
        State state = ds.getState();
        bytes24 buildingTile = state.getFixedLocation(buildingInstance);
        int16 coreQ = int16(int192(uint192(buildingTile) >> 32));
        int16 coreR = int16(int192(uint192(buildingTile) >> 16));
        int16 coreS = int16(int192(uint192(buildingTile)));

        // resetting the map
        // rocks at room 4
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, coreQ + 5, coreR + -4, coreS + -1))
        ); // 11, -10, -1
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, coreQ + 7, coreR + -6, coreS + -1))
        ); // 13, -12, -1
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, coreQ + 7, coreR + -8, coreS + 1))
        ); // 13, -14, 1
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, coreQ + 5, coreR + -6, coreS + 1))
        ); // 11, -12, 1
        //crusher at room 5
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_CRUSHER, coreQ + 0, coreR + -6, coreS + 6))
        ); // 6, -12, 6

        //items at room 3
        int16 q = coreQ + 8; // 14
        int16 r = coreR + -1; // -7
        int16 s = coreS + -7; // -7
        bytes24 bagId = bytes24(abi.encodePacked(Kind.Bag.selector, uint96(0), int16(0), q, r, s));
        bytes24 tileId = bytes24(abi.encodePacked(Kind.Tile.selector, uint96(0), int16(0), q, r, s));
        bytes24[] memory items = new bytes24[](4);
        uint64[] memory balances = new uint64[](4);
        items[0] = sword;
        items[1] = shield;
        items[2] = armor;
        items[3] = bytes24(0);
        balances[0] = 1;
        balances[1] = 1;
        balances[2] = 1;
        balances[3] = 0;
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.DEV_SPAWN_BAG, (bagId, address(0), tileId, 0, items, balances))
        );
    }
}
