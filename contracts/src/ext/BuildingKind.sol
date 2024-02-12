// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import "cog/IState.sol";

interface IBuildingKind {
    function use(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID, bytes memory payload) external;
    function construct(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID, bytes memory payload) external;
}

contract BuildingKind is IBuildingKind {
    function use(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID, bytes memory payload) external virtual {}
    function construct(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID, bytes memory payload)
        external
        virtual
    {}
    function onUnitArrive(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID) external virtual {}
    function onUnitLeave(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID) external virtual {}
}
