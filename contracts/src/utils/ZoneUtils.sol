// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {CompoundKeyDecoder} from "cog/IState.sol";

library ZoneUtils {
    function getZoneKey(bytes24 zone) pure internal returns (int16) {
        return int16(uint16(CompoundKeyDecoder.UINT64(zone)));
    }
}