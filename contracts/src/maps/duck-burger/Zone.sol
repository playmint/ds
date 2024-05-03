// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ZoneKind} from "@ds/ext/ZoneKind.sol";
import {IDuckBurgerZone} from "./IZone.sol";
import {Game} from "cog/IGame.sol";
import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, Node, Q, R, S} from "@ds/schema/Schema.sol";
import {Actions, FacingDirectionKind} from "@ds/actions/Actions.sol";

using Schema for State;

contract DuckBurgerZone is ZoneKind, IDuckBurgerZone {
    // extractors
    bytes24 constant _EXTRACTOR_RED = 0xbe92755c00000000000000009b33b1d40000000000000002;
    bytes24 constant _EXTRACTOR_GREEN = 0xbe92755c0000000000000000283cbd350000000000000002;
    bytes24 constant _EXTRACTOR_BLUE = 0xbe92755c00000000000000006d39c34a0000000000000002;
    // duck burger buildings
    bytes24 constant _DISPLAY_DUCK = 0xbe92755c000000000000000061a27d260000000000000005;
    bytes24 constant _DISPLAY_BURGER = 0xbe92755c0000000000000000767359700000000000000005;
    bytes24 constant _COUNTDOWN = 0xbe92755c0000000000000000dc8c08550000000000000005;
    bytes24 constant _BILLBOARD = 0xbe92755c000000000000000016bd33ac0000000000000006;

    function reset(Game ds, bytes24 originTile) public {
        (int16 z, int16 q, int16 r, int16 s) = getTileCoords(originTile); // state.getTileCoords(originTile); // doesn't work
        //bytes24 zone = Node.Zone(z);
        // TODO: require owner or allowed building
        State state = GetState(ds);
        _reset(ds, z, q, r, s);
        _resetInRadius(state, ds, originTile);
    }

    function _reset(Game ds, int16 z, int16 q, int16 r, int16 s) internal {
        // extractors - ducks
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_EXTRACTOR_RED, z, q - 6, r + 2, s + 4, FacingDirectionKind.RIGHT)
            )
        );
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_EXTRACTOR_GREEN, z, q - 6, r + 3, s + 3, FacingDirectionKind.RIGHT)
            )
        );
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_EXTRACTOR_BLUE, z, q - 6, r + 4, s + 2, FacingDirectionKind.RIGHT)
            )
        );
        // extractors - burgers
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_EXTRACTOR_RED, z, q + 6, r - 4, s - 2, FacingDirectionKind.RIGHT)
            )
        );
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_EXTRACTOR_GREEN, z, q + 6, r - 3, s - 3, FacingDirectionKind.RIGHT)
            )
        );
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_EXTRACTOR_BLUE, z, q + 6, r - 2, s - 4, FacingDirectionKind.RIGHT)
            )
        );
        // duck burger buildings
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_DISPLAY_DUCK, z, q + 1, r + -4, s + 3, FacingDirectionKind.LEFT)
            )
        );
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_DISPLAY_BURGER, z, q + 3, r + -4, s + 1, FacingDirectionKind.LEFT)
            )
        );
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.DEV_SPAWN_BUILDING, (_COUNTDOWN, z, q + 2, r + -4, s + 2, FacingDirectionKind.LEFT))
        );
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (_BILLBOARD, z, q + -3, r + 6, s + -3, FacingDirectionKind.RIGHT)
            )
        );
    }

    function _resetInRadius(State state, Game ds, bytes24 tile) public {
        bytes24 _WEAK_DUCK = 0xbe92755c0000000000000000546391e80000000000000003;
        bytes24 _WEAK_BURGER = 0xbe92755c0000000000000000444749c70000000000000003;

        bytes24[99] memory arenaTiles = range5(tile);
        for (uint256 i = 0; i < arenaTiles.length; i++) {
            bytes24 arenaBuildingID = Node.Building(
                coords(arenaTiles[i])[0], coords(arenaTiles[i])[1], coords(arenaTiles[i])[2], coords(arenaTiles[i])[3]
            );
            bytes24 arenaBuildingKindId = state.getBuildingKind(arenaBuildingID);
            if (arenaBuildingKindId == _WEAK_DUCK || arenaBuildingKindId == _WEAK_BURGER) {
                ds.getDispatcher().dispatch(
                    abi.encodeCall(
                        Actions.DEV_DESTROY_BUILDING,
                        (
                            coords(arenaTiles[i])[0],
                            coords(arenaTiles[i])[1],
                            coords(arenaTiles[i])[2],
                            coords(arenaTiles[i])[3]
                        )
                    )
                );
            }
        }
    }

    function coords(bytes24 tile) internal pure returns (int16[4] memory keys) {
        keys = CompoundKeyDecoder.INT16_ARRAY(tile);
    }

    function range5(bytes24 tile) internal pure returns (bytes24[99] memory results) {
        int16 range = 5;
        int16[4] memory tileCoords = coords(tile);
        uint256 i = 0;
        for (int16 q = tileCoords[1] - range; q <= tileCoords[1] + range; q++) {
            for (int16 r = tileCoords[2] - range; r <= tileCoords[2] + range; r++) {
                int16 s = -q - r;
                bytes24 nextTile = Node.Tile(tileCoords[0], q, r, s);
                if (distance(tile, nextTile) <= uint256(uint16(range))) {
                    results[i] = nextTile;
                    i++;
                }
            }
        }
        return results;
    }

    function distance(bytes24 tileA, bytes24 tileB) internal pure returns (uint256) {
        int16[4] memory a = CompoundKeyDecoder.INT16_ARRAY(tileA);
        int16[4] memory b = CompoundKeyDecoder.INT16_ARRAY(tileB);
        return uint256(
            (abs(int256(a[Q]) - int256(b[Q])) + abs(int256(a[R]) - int256(b[R])) + abs(int256(a[S]) - int256(b[S]))) / 2
        );
    }

    function abs(int256 n) internal pure returns (int256) {
        return n >= 0 ? n : -n;
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

    function GetState(Game ds) internal returns (State) {
        return ds.getState();
    }
}
