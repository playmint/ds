// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ZoneKind} from "@ds/ext/ZoneKind.sol";
import {ILabyrinthZone} from "./IZone.sol";
import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, Node} from "@ds/schema/Schema.sol";
import {Actions, FacingDirectionKind} from "@ds/actions/Actions.sol";

using Schema for State;

contract LabyrinthZone is ZoneKind, ILabyrinthZone {
    bytes24 constant _RESET_TOWER = 0xbe92755c0000000000000000f1e6d10a0000000000000004;

    // for respawn
    bytes24 constant _LARGE_ROCKS = 0xbe92755c0000000000000000d4c1c6880000000000000001;
    bytes24 constant _CRUSHER = 0xbe92755c0000000000000000e92c4edd0000000000000001;
    bytes24 constant sword = 0x6a7a67f01df41ea10000000000000001000000010000001e;
    bytes24 constant shield = 0x6a7a67f0ab4f7a160000000000000014000000280000000a;
    bytes24 constant armor = 0x6a7a67f06a60bb99000000000000001e0000001400000001;

    function reset(Game ds, bytes24 originTile) public {
        // originTile is [0, 0, 0] for non transposed map
        (int16 z, int16 q, int16 r, int16 s) = getTileCoords(originTile); // state.getTileCoords(originTile); // doesn't work
        bytes24 zone = Node.Zone(z);
        _requireOwnerOrResetTower(ds, zone, msg.sender);
        _reset(ds, z, q, r, s);
    }

    function _reset(Game ds, int16 z, int16 q, int16 r, int16 s) internal {
        // resetting the map
        // rocks at room 4
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, z, q + 11, r + -10, s + -1, FacingDirectionKind.RIGHT)
            )
        );
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, z, q + 13, r + -12, s + -1, FacingDirectionKind.RIGHT)
            )
        );
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, z, q + 13, r + -14, s + 1, FacingDirectionKind.RIGHT)
            )
        );
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_LARGE_ROCKS, z, q + 11, r + -12, s + 1, FacingDirectionKind.RIGHT)
            )
        );
        //crusher at room 5
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_CRUSHER, z, q + 6, r + -12, s + 6, FacingDirectionKind.RIGHT))
        );

        //items at room 3
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
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_BAG, (z, q + 14, r + -7, s + -7, 0, items, balances)));
    }

    function _requireOwnerOrResetTower(Game ds, bytes24 zone, address sender) internal {
        State state = ds.getState();
        require(
            sender == state.getImplementation(_RESET_TOWER) || Node.Player(sender) == state.getOwner(zone),
            "Only the owner or the reset tower can call public reset"
        );
    }

    function getTileCoords(bytes24 tile) internal pure returns (int16 z, int16 q, int16 r, int16 s) {
        int16[4] memory keys = INT16_ARRAY(tile);
        return (keys[0], keys[1], keys[2], keys[3]);
    }

    function INT16_ARRAY(bytes24 id) internal pure returns (int16[4] memory keys) {
        keys[0] = int16(int192(uint192(id) >> 48));
        keys[1] = int16(int192(uint192(id) >> 32));
        keys[2] = int16(int192(uint192(id) >> 16));
        keys[3] = int16(int192(uint192(id)));
    }
}
