// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Dispatcher} from "cog/IDispatcher.sol";
import {State} from "cog/IState.sol";
import {Schema, Kind, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {ILabyrinthCore} from "./ILabyrinthCore.sol";

using Schema for State;

contract ResetTower is BuildingKind {
    function getPasswordHash() internal pure returns (bytes32) {
        return 0x1f1fc8e191099524ede873ed4b43087e02baaa5f39243fdd808f60582dc7702e;
    }

    function password(string calldata pswd) public {}

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes calldata payload) public override {
        // Check password
        require((bytes4)(payload) == this.password.selector, "Invalid payload");
        (string memory pswd) = abi.decode(payload[4:], (string));
        require(keccak256(abi.encodePacked(pswd)) == getPasswordHash(), "Invalid password");

        State state = ds.getState();
        bytes24 buildingTile = state.getFixedLocation(buildingInstance);

        // Get location of origin (0, 0, 0) on non offset map by subtracting original reset tower coordinates [-2, 2, 0]
        int16 coreQ = int16(int192(uint192(buildingTile) >> 32)) - -2;
        int16 coreR = int16(int192(uint192(buildingTile) >> 16)) - 2;
        int16 coreS = int16(int192(uint192(buildingTile))) - 0;

        // Get location of core tower
        coreQ += 6;
        coreR += -6;
        coreS += 0;

        // Get core building instance
        bytes24 coreBuildingInstance = INT16_ARRAY(Kind.Building.selector, [int16(0), coreQ, coreR, coreS]);
        bytes24 coreBuildingKind = state.getBuildingKind(coreBuildingInstance);
        ILabyrinthCore coreBuildingImpl = ILabyrinthCore(state.getImplementation(coreBuildingKind));

        require(address(coreBuildingImpl) != address(0), "Core building not found");

        coreBuildingImpl.reset(ds, coreBuildingInstance);
    }

    function INT16_ARRAY(bytes4 kindID, int16[4] memory keys) internal pure returns (bytes24) {
        return bytes24(abi.encodePacked(kindID, uint96(0), keys[0], keys[1], keys[2], keys[3]));
    }
}
