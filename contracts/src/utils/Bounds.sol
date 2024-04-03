// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

library Bounds {
    int16 constant MAX_RANGE = 40;

    function isInBounds(int16 q, int16 r, int16 s) internal pure returns (bool) {
        int16 distance = max(abs(q), max(abs(r), abs(s)));
        return distance <= MAX_RANGE;
    }

    function max(int16 a, int16 b) internal pure returns (int16) {
        return a >= b ? a : b;
    }

    function abs(int16 x) internal pure returns (int16) {
        return x >= 0 ? x : -x;
    }
}
