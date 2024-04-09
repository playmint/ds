// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State, CompoundKeyEncoder, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, Node, Kind, Z, Q, R, S} from "@ds/schema/Schema.sol";

using Schema for State;

library TileUtils {
    uint256 constant $MAX_INT = 2 ** 256 - 1;

    function coords(bytes24 tile) internal pure returns (int16[4] memory keys) {
        keys = CompoundKeyDecoder.INT16_ARRAY(tile);
    }

    function distance(bytes24 tileA, bytes24 tileB) internal pure returns (uint256) {
        int16[4] memory a = CompoundKeyDecoder.INT16_ARRAY(tileA);
        int16[4] memory b = CompoundKeyDecoder.INT16_ARRAY(tileB);
        if (
            a[Z] != b[Z] // If the two tiles are in different zones, return the maximum distance
        ) {
            return $MAX_INT;
        }
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
