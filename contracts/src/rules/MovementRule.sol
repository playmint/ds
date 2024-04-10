// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import "cog/IState.sol";
import "cog/IRule.sol";
import "cog/IDispatcher.sol";

import {Schema, Node, BiomeKind, TRAVEL_SPEED} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {Bounds} from "@ds/utils/Bounds.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {DownstreamGame} from "@ds/Downstream.sol";

// import {ERC721} from "solmate/tokens/ERC721.sol";

using Schema for State;

contract MovementRule is Rule {
    DownstreamGame game;

    // Maps zone id to the number of units in that zone
    mapping (int16 => uint256) public zoneUnitCount;

    constructor(DownstreamGame g) {
        game = g;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.MOVE_MOBILE_UNIT.selector) {
            // decode the action
            (int16 z, int16 q, int16 r, int16 s) = abi.decode(action[4:], (int16, int16, int16, int16));

            require(Bounds.isInBounds(q, r, s), "MOVE_MOBILE_UNIT coords out of bounds");

            // encode the full mobileUnit node id
            bytes24 mobileUnit = Node.MobileUnit(ctx.sender);

            // check that sender owns mobileUnit
            require(state.getOwner(mobileUnit) == Node.Player(ctx.sender), "NoMoveNotOwner");

            // encode destination tile
            bytes24 destTile = Node.Tile(z, q, r, s);

            // check that the destination tile has been discovered
            require(state.getBiome(destTile) != BiomeKind.UNDISCOVERED, "NoMoveToUndiscovered");

            // move
            moveTo(state, mobileUnit, destTile, ctx.clock);
        }

        return state;
    }

    function moveTo(State state, bytes24 mobileUnit, bytes24 destTile, uint64 nowTime) private {
        //
        // fetch the mobileUnit's current location
        (bytes24 currentTile) = state.getCurrentLocation(mobileUnit, nowTime);

        // check if the mobileUnit is already at the destination
        if (currentTile == destTile) {
            return;
        }

        // check that destTile is direct 6-axis line from currentTile
        // require(TileUtils.isDirect(currentTile, destTile), "NoMoveToIndirect");
        // require(state.getBiome(currentTile) == BiomeKind.DISCOVERED, "NoMoveToUndiscovered");
        // state.setPrevLocation(mobileUnit, currentTile, nowTime);
        // calc distance to next tile
        // x10 so we can move at speeds slower than 1TilePerBlock
        // uint256 distance = TileUtils.distance(currentTile, destTile) * 10;
        // if (distance == 0) {
        //     return;
        // }
        // work out travel time
        // uint64 travelTime = uint64(uint16(distance) / uint64(uint16(TRAVEL_SPEED)));
        // if (travelTime == 0) {
        //     travelTime = 1;
        // }

        // [!] various changes to the game mean that movement as initially
        //     implemented does not work blockers, long paths, faster simulation,
        //     etc we are temporarily letting you basically teleport anywhere ...
        //     and only the client is restricting movement until we have the
        //     process nailed more
        state.setNextLocation(mobileUnit, destTile, nowTime);
        state.setPrevLocation(mobileUnit, currentTile, nowTime);

        // assign to parent zone
        state.setParent(mobileUnit, state.getParent(destTile));

        // Get building at current tile and call leave hook
        (int16 z, int16 q, int16 r, int16 s) = state.getTileCoords(currentTile);
        bytes24 building = Node.Building(z, q, r, s);
        bytes24 buildingKind = state.getBuildingKind(building);
        if (buildingKind != bytes24(0)) {
            BuildingKind buildingImplementation = BuildingKind(state.getImplementation(buildingKind));
            if (address(buildingImplementation) != address(0)) {
                buildingImplementation.onUnitLeave(game, building, mobileUnit);
            }
        }

        // Count the unit out of the current zone
        if (z > 0) {
            zoneUnitCount[z] -= 1;
        }

        // Get building at dest tile and call arrive hook
        (z, q, r, s) = state.getTileCoords(destTile);
        building = Node.Building(z, q, r, s);
        buildingKind = state.getBuildingKind(building);
        if (buildingKind != bytes24(0)) {
            BuildingKind buildingImplementation = BuildingKind(state.getImplementation(buildingKind));
            if (address(buildingImplementation) != address(0)) {
                buildingImplementation.onUnitArrive(game, building, mobileUnit);
            }
        }

        // Count the unit into the new zone
        if (z > 0) { 
            zoneUnitCount[z] += 1;

            bytes24 player = state.getOwner(mobileUnit);

            // If player doesn't own zone check limit
            if (zoneUnitCount[z] > 1 && game.zoneOwnership().ownerOf(uint16(z)) != address(uint160(uint192(player)))) {
                revert("Limit reached on zone");
            }
        }
    }
}
