// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import {DownstreamGame} from "@ds/Downstream.sol";

contract Deployer is Script {
    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        DownstreamGame ds = DownstreamGame(vm.envAddress("GAME_ADDRESS"));
        address addr = vm.envAddress("ADDR");

        vm.startBroadcast(deployerPrivateKey);
        ds.allow(addr);
        vm.stopBroadcast();
    }
}
