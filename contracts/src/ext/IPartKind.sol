// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";

interface IPartKind {
    function callAction(State state, bytes24 partId, uint8 actionIndex, bytes memory payload) external;
}
