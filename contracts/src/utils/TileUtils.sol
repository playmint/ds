// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, Node, Kind, Q, R, S} from "@ds/schema/Schema.sol";

using Schema for State;

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

    function range2(bytes24 tile) internal pure returns (bytes24[99] memory results) {
        int16 range = 2;
        int16[4] memory tileCoords = coords(tile);
        uint i = 0;
        for (int16 q=tileCoords[1]-range; q <= tileCoords[1]+range; q++) {
            for (int16 r=tileCoords[2]-range; r <= tileCoords[2]+range; r++) {
                int16 s = -q-r;
                bytes24 nextTile = Node.Tile(0, q, r, s);
                if (distance(tile, nextTile) <= uint256(uint16(range))) {
                    results[i] = nextTile;
                    i++;
                }
            }
        }
        return results;
    }
}
