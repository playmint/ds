// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Dispatcher} from "cog/IDispatcher.sol";
import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, Kind, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {ILabyrinthCore} from "./ILabyrinthCore.sol";
import {ILabyrinthZone} from "./IZone.sol"; // TODO: ds apply cannot find "../../../IZone.sol";

using Schema for State;

contract ResetTower is BuildingKind {
    function getPasswordHash() internal pure returns (bytes32) {
        return 0x56eb92e3029c3933e5350d8418880dd9fa7c329cb0cbf40a904129df80f1a668;
    }

    function password(string calldata pswd) public {}

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes calldata payload) public override {
        // Check password
        require((bytes4)(payload) == this.password.selector, "Invalid payload");
        (string memory pswd) = abi.decode(payload[4:], (string));
        require(keccak256(abi.encodePacked(pswd)) == getPasswordHash(), "Invalid password");

        State state = ds.getState();
        bytes24 buildingTile = state.getFixedLocation(buildingInstance);
        (int16 z, int16 q, int16 r, int16 s) = getTileCoords(buildingTile);
        bytes24 zone = Node.Zone(z);

        ILabyrinthZone zoneImpl = ILabyrinthZone(state.getImplementation(zone));
        require(zoneImpl != ILabyrinthZone(address(0)), "Zone implementation not found");

        // Offset by the reset building's original coordinates found in room_1.yaml to get the origin coordinates
        q -= -2;
        r -= 2;
        s -= 0;

        zoneImpl.reset(ds, Node.Tile(z, q, r, s));
    }

    function getTileCoords(bytes24 tile) internal pure returns (int16 z, int16 q, int16 r, int16 s) {
        int16[4] memory keys = INT16_ARRAY(tile);
        return (keys[0], keys[1], keys[2], keys[3]);
    }

    function INT16_ARRAY(bytes24 id) internal pure returns (int16[4] memory keys) {
        keys[0] = int16(int192(uint192(id) >> 48));
        keys[1] = int16(int192(uint192(id) >> 32));
        keys[2] = int16(int192(uint192(id) >> 16));
        keys[3] = int16(int192(uint192(id)));
    }
}
