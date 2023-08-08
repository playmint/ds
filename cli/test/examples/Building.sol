// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@ds/IDownstream.sol";

contract HammerFactory {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*mobileUnit*/ bytes calldata /*payload*/ ) public {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
    }
}
