// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, CombatWinState} from "@ds/schema/Schema.sol";
import {ZoneKind} from "@ds/ext/ZoneKind.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

contract Zone is ZoneKind {
    function toggleUnwalkableTiles(bytes24 b) external {}

    bool public showingWalkableTiles = true;
    bytes24[18] public unwalkableTiles;

    constructor() {
        unwalkableTiles = [
            bytes24(0xe5a62ffc0000000000000000000000000001fffd0008fffb),
            bytes24(0xe5a62ffc0000000000000000000000000001fffd0009fffa),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe0006fffc),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe0008fffa),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe000afff8),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0005fffc),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0006fffb),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0009fff8),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff000afff7),
            bytes24(0xe5a62ffc000000000000000000000000000100010004fffb),
            bytes24(0xe5a62ffc000000000000000000000000000100010005fffa),
            bytes24(0xe5a62ffc000000000000000000000000000100010008fff7),
            bytes24(0xe5a62ffc000000000000000000000000000100010009fff6),
            bytes24(0xe5a62ffc000000000000000000000000000100020004fffa),
            bytes24(0xe5a62ffc000000000000000000000000000100020006fff8),
            bytes24(0xe5a62ffc000000000000000000000000000100020008fff6),
            bytes24(0xe5a62ffc000000000000000000000000000100030005fff8),
            bytes24(0xe5a62ffc000000000000000000000000000100030006fff7)
        ];
    }

    function use(Game ds, bytes24, /*zoneID*/ bytes24, /*mobileUnitID*/ bytes calldata payload) public override {
        State state = ds.getState();
        if ((bytes4)(payload) == this.toggleUnwalkableTiles.selector) {
            // Getting zone using buildingInstance
            (bytes24 buildingInstance) = abi.decode(payload[4:], (bytes24));
            bytes24 buildingTile = state.getFixedLocation(buildingInstance);
            (int16 z,,,) = getTileCoords(buildingTile);

            for (uint256 i = 0; i < unwalkableTiles.length; i++) {
                bytes24 tile = unwalkableTiles[i];
                (, int16 q, int16 r, int16 s) = getTileCoords(tile);
                if (showingWalkableTiles) {
                    ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_DESTROY_TILE, (z, q, r, s)));
                } else {
                    ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (z, q, r, s)));
                }
            }

            showingWalkableTiles = !showingWalkableTiles;
        }
    }

    function getTileCoords(bytes24 tile) internal pure returns (int16, int16, int16, int16) {
        int16[4] memory keys = CompoundKeyDecoder.INT16_ARRAY(tile);
        return (keys[0], keys[1], keys[2], keys[3]);
    }

    function onUnitArrive(Game ds, bytes24, /*zoneID*/ bytes24 mobileUnitID) external override {
        State state = ds.getState();

        bytes24 tile = state.getNextLocation(mobileUnitID);
        (, int16 q, int16 r, int16 s) = getTileCoords(tile);

        bool canWalkHere = true;
        for (uint256 i = 0; i < unwalkableTiles.length; i++) {
            (, int16 q2, int16 r2, int16 s2) = getTileCoords(unwalkableTiles[i]);
            if (q == q2 && r == r2 && s == s2) {
                canWalkHere = false;
                break;
            }
        }
        require(canWalkHere, "Zone logic is stopping you from walking here");
    }

    function onCombatStart(Game, /*ds*/ bytes24, /*zoneID*/ bytes24, /*mobileUnitID*/ bytes24 /*sessionID*/ )
        external
        pure
        override
    {
        revert("Combat is disabled in this zone");
    }
}
