// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ZoneKind} from "@ds/ext/ZoneKind.sol";
import {IHexcraftZone} from "./IZone.sol";
import {Game} from "cog/IGame.sol";
import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, Node, Q, R, S} from "@ds/schema/Schema.sol";
import {Actions, FacingDirectionKind} from "@ds/actions/Actions.sol";

using Schema for State;

contract HexcraftZone is ZoneKind, IHexcraftZone {

    bytes24[88] public buildingKindIds;
    bytes24[88] public tileIds;

    // buildingKindIds and tileIds are listed in the same order 
    constructor() {
        buildingKindIds = [
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c0000000000000000bc0799770000000000000002),
            bytes24(0xbe92755c00000000000000004b338b6d0000000000000003),
            bytes24(0xbe92755c000000000000000030bcfd790000000000000002),
            bytes24(0xbe92755c000000000000000087d3b87c0000000000000004),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c000000000000000030bcfd790000000000000002),
            bytes24(0xbe92755c000000000000000059e870b60000000000000003),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c000000000000000079cfb3570000000000000002),
            bytes24(0xbe92755c0000000000000000bc0799770000000000000002),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c000000000000000030bcfd790000000000000002),
            bytes24(0xbe92755c000000000000000059e870b60000000000000003),
            bytes24(0xbe92755c00000000000000004b338b6d0000000000000003),
            bytes24(0xbe92755c000000000000000079cfb3570000000000000002),
            bytes24(0xbe92755c0000000000000000bc0799770000000000000002),
            bytes24(0xbe92755c0000000000000000763af3200000000000000004),
            bytes24(0xbe92755c000000000000000030bcfd790000000000000002),
            bytes24(0xbe92755c0000000000000000bc0799770000000000000002),
            bytes24(0xbe92755c000000000000000030bcfd790000000000000002),
            bytes24(0xbe92755c000000000000000030bcfd790000000000000002),
            bytes24(0xbe92755c0000000000000000bc0799770000000000000002),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c0000000000000000bc0799770000000000000002),
            bytes24(0xbe92755c000000000000000079cfb3570000000000000002),
            bytes24(0xbe92755c000000000000000079cfb3570000000000000002),
            bytes24(0xbe92755c000000000000000079cfb3570000000000000002),
            bytes24(0xbe92755c000000000000000030bcfd790000000000000002),
            bytes24(0xbe92755c0000000000000000bc0799770000000000000002),
            bytes24(0xbe92755c000000000000000079cfb3570000000000000002),
            bytes24(0xbe92755c000000000000000030bcfd790000000000000002),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c0000000000000000580ea6c80000000000000001),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c0000000000000000818eec0b0000000000000004),
            bytes24(0xbe92755c000000000000000086db24a70000000000000006),
            bytes24(0xbe92755c00000000000000002c692fb70000000000000003),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c000000000000000060c91df80000000000000003),
            bytes24(0xbe92755c00000000000000007450bea60000000000000001),
            bytes24(0xbe92755c000000000000000079cfb3570000000000000002),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c00000000000000009f8924720000000000000003),
            bytes24(0xbe92755c00000000000000004e6c280a0000000000000003),
            bytes24(0xbe92755c00000000000000004e6c280a0000000000000003),
            bytes24(0xbe92755c0000000000000000bc0799770000000000000002),
            bytes24(0xbe92755c000000000000000079cfb3570000000000000002),
            bytes24(0xbe92755c000000000000000029404fea0000000000000001),
            bytes24(0xbe92755c00000000000000009f8924720000000000000003),
            bytes24(0xbe92755c000000000000000060c91df80000000000000003),
            bytes24(0xbe92755c00000000000000002c692fb70000000000000003)
        ];
        tileIds = [
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0008fff9),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0009fff8),
            bytes24(0xe5a62ffc0000000000000000000000000001fff9000efff9),
            bytes24(0xe5a62ffc0000000000000000000000000001fff90008ffff),
            bytes24(0xe5a62ffc0000000000000000000000000001fff90009fffe),
            bytes24(0xe5a62ffc000000000000000000000000000100080008fff0),
            bytes24(0xe5a62ffc0000000000000000000000000001fff700060003),
            bytes24(0xe5a62ffc000000000000000000000000000100090006fff1),
            bytes24(0xe5a62ffc0000000000000000000000000001fff600080002),
            bytes24(0xe5a62ffc000000000000000000000000000100000008fff8),
            bytes24(0xe5a62ffc000000000000000000000000000100060005fff5),
            bytes24(0xe5a62ffc000000000000000000000000000100040009fff3),
            bytes24(0xe5a62ffc0000000000000000000000000001fff700080001),
            bytes24(0xe5a62ffc000000000000000000000000000100010008fff7),
            bytes24(0xe5a62ffc000000000000000000000000000100060006fff4),
            bytes24(0xe5a62ffc0000000000000000000000000001fff500060005),
            bytes24(0xe5a62ffc0000000000000000000000000001fff800080000),
            bytes24(0xe5a62ffc000000000000000000000000000100020008fff6),
            bytes24(0xe5a62ffc0000000000000000000000000001fff600050005),
            bytes24(0xe5a62ffc0000000000000000000000000001fff400090003),
            bytes24(0xe5a62ffc000000000000000000000000000100040006fff6),
            bytes24(0xe5a62ffc0000000000000000000000000001fff300040009),
            bytes24(0xe5a62ffc0000000000000000000000000001fff100080007),
            bytes24(0xe5a62ffc000000000000000000000000000100030008fff5),
            bytes24(0xe5a62ffc0000000000000000000000000001fff200060008),
            bytes24(0xe5a62ffc000000000000000000000000000100090005fff2),
            bytes24(0xe5a62ffc000000000000000000000000000100070009fff0),
            bytes24(0xe5a62ffc0000000000000000000000000001fff100090006),
            bytes24(0xe5a62ffc0000000000000000000000000001fff300050008),
            bytes24(0xe5a62ffc000000000000000000000000000100000007fff9),
            bytes24(0xe5a62ffc000000000000000000000000000100050005fff6),
            bytes24(0xe5a62ffc000000000000000000000000000100080007fff1),
            bytes24(0xe5a62ffc0000000000000000000000000001fff200070007),
            bytes24(0xe5a62ffc0000000000000000000000000001fff700050004),
            bytes24(0xe5a62ffc0000000000000000000000000001ffef000c0005),
            bytes24(0xe5a62ffc00000000000000000000000000010006000bffef),
            bytes24(0xe5a62ffc00000000000000000000000000010007000affef),
            bytes24(0xe5a62ffc00000000000000000000000000010006000cffee),
            bytes24(0xe5a62ffc0000000000000000000000000001fffc000afffa),
            bytes24(0xe5a62ffc0000000000000000000000000001fffa000cfffa),
            bytes24(0xe5a62ffc0000000000000000000000000001fffb000afffb),
            bytes24(0xe5a62ffc0000000000000000000000000001fffa000dfff9),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe0004fffe),
            bytes24(0xe5a62ffc0000000000000000000000000001fff9000dfffa),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0002ffff),
            bytes24(0xe5a62ffc0000000000000000000000000001fffd0006fffd),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0003fffe),
            bytes24(0xe5a62ffc0000000000000000000000000001fffa000efff8),
            bytes24(0xe5a62ffc0000000000000000000000000001fffb000cfff9),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0004fffd),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe0006fffc),
            bytes24(0xe5a62ffc0000000000000000000000000001fffb000dfff8),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe0007fffb),
            bytes24(0xe5a62ffc0000000000000000000000000001fffa0007ffff),
            bytes24(0xe5a62ffc0000000000000000000000000001fffd0009fffa),
            bytes24(0xe5a62ffc0000000000000000000000000001fffc000cfff8),
            bytes24(0xe5a62ffc0000000000000000000000000001fffb0006ffff),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe0008fffa),
            bytes24(0xe5a62ffc0000000000000000000000000001fffd000bfff8),
            bytes24(0xe5a62ffc0000000000000000000000000001fffa0008fffe),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe000afff8),
            bytes24(0xe5a62ffc0000000000000000000000000001fff9000afffd),
            bytes24(0xe5a62ffc0000000000000000000000000001fffc0005ffff),
            bytes24(0xe5a62ffc0000000000000000000000000001fff9000bfffc),
            bytes24(0xe5a62ffc0000000000000000000000000001fffd0004ffff),
            bytes24(0xe5a62ffc0000000000000000000000000001fffb0008fffd),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe0003ffff),
            bytes24(0xe5a62ffc0000000000000000000000000001fffc0007fffd),
            bytes24(0xe5a62ffc0000000000000000000000000001fff9000cfffb),
            bytes24(0xe5a62ffc0000000000000000000000000001fffb0009fffc),
            bytes24(0xe5a62ffc000000000000000000000000000100000002fffe),
            bytes24(0xe5a62ffc00000000000000000000000000010001ffff0000),
            bytes24(0xe5a62ffc00000000000000000000000000010002fffd0001),
            bytes24(0xe5a62ffc0000000000000000000000000001fff3000a0003),
            bytes24(0xe5a62ffc000000000000000000000000000100000003fffd),
            bytes24(0xe5a62ffc0000000000000000000000000001fff3000b0002),
            bytes24(0xe5a62ffc000000000000000000000000000100000004fffc),
            bytes24(0xe5a62ffc0000000000000000000000000001fff0000a0006),
            bytes24(0xe5a62ffc000000000000000000000000000100000005fffb),
            bytes24(0xe5a62ffc00000000000000000000000000010002000afff4),
            bytes24(0xe5a62ffc00000000000000000000000000010002000bfff3),
            bytes24(0xe5a62ffc0000000000000000000000000001fff4000b0001),
            bytes24(0xe5a62ffc0000000000000000000000000001fff0000b0005),
            bytes24(0xe5a62ffc0000000000000000000000000001000a0004fff2),
            bytes24(0xe5a62ffc000000000000000000000000000100000006fffa),
            bytes24(0xe5a62ffc0000000000000000000000000001fff5000a0001),
            bytes24(0xe5a62ffc00000000000000000000000000010003000bfff2),
            bytes24(0xe5a62ffc00000000000000000000000000010004000afff2)
        ];
    }

    function use(Game ds, bytes24 zoneID, bytes24 mobileUnitID, bytes calldata payload) public override(IHexcraftZone, ZoneKind) {}

    function resetWorld(Game ds, bytes24 selectedBuildingId) public{
        _resetWorld(ds, selectedBuildingId);
    }

    function _resetWorld(Game ds, bytes24 buildingId) internal {
        State state = ds.getState();
        bytes24 buildingTile = state.getFixedLocation(buildingId);
        (int16 z, , , ) = getTileCoords(buildingTile);

    for (uint16 i = 0; i < buildingKindIds.length; i++) {
        (, int16 q, int16 r, int16 s) = getTileCoords(tileIds[i]);
        bytes24 building = buildingKindIds[i];
        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.DEV_SPAWN_BUILDING, (building, z, q, r, s, FacingDirectionKind.RIGHT)
            )
        );
    }
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

    function GetState(Game ds) internal returns (State) {
        return ds.getState();
    }
}
