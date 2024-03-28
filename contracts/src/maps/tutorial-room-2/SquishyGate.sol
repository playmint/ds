// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {Gate} from "./Gate.sol";

using Schema for State;

contract SquishyGate is Gate {
    function getKeyId() internal pure override returns (bytes24) {
        return 0x6a7a67f05e359ab500000001000000010000000100000002;
    }
}
