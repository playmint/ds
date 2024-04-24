// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import "cog/IState.sol";
import "cog/IRule.sol";

import {Schema, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {IZoneKind} from "@ds/ext/ZoneKind.sol";

using Schema for State;

contract ZoneRule is Rule {
    Game game;

    constructor(Game g) {
        game = g;
    }

    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.ZONE_USE.selector) {
            (bytes24 mobileUnitID, bytes memory payload) =
                abi.decode(action[4:], (bytes24, bytes));
            _useZone(state, mobileUnitID, payload, ctx);
        } 
        return state;
    }

    function _useZone(
        State state,
        bytes24 mobileUnit,
        bytes memory payload,
        Context calldata ctx
    ) internal {
        // check player owns mobileUnit
        if (Node.Player(ctx.sender) != state.getOwner(mobileUnit)) {
            revert("MobileUnitNotOwnedByPlayer");
        }
        // get location
        bytes24 mobileUnitTile = state.getCurrentLocation(mobileUnit, ctx.clock);

        // get zone
        bytes24 zone = Node.Zone(state.getTileZone(mobileUnitTile));

        // get zone implementation
        IZoneKind zoneImplementation = IZoneKind(state.getImplementation(zone));
        // if no implementation set, then this is a no-op
        if (address(zoneImplementation) == address(0)) {
            return;
        }
        // call the implementation
        zoneImplementation.use(game, zone, mobileUnit, payload);
    }
}