// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IGame.sol";
import "cog/IState.sol";
import {ItemKind} from "@ds/ext/ItemKind.sol";
import {Schema, Kind, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

contract Cocktail is ItemKind {
    string constant KEY_SIPS = "sips";

    // encode/decode signatures
    function sip() external {}

    // executed when ITEM_USE is called
    function use(
        Game ds,
        bytes24 itemID, // item being used
        bytes24, /*mobileUnitID*/ // unit useing the item
        bytes calldata payload // a blob of data for you to decide what to do with
    ) external override {
        if ((bytes4)(payload) == this.sip.selector) {
            _sip(ds, itemID);
        } else {
            revert("unknown use action");
        }
    }

    function _sip(Game ds, bytes24 itemID) private {
        State state = ds.getState();
        uint64 numSips = uint64(uint256(state.getData(itemID, KEY_SIPS)));
        numSips++;
        bytes32 encodedSips = bytes32(uint256(numSips));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.SET_DATA_ON_ITEM, (itemID, KEY_SIPS, encodedSips)));
    }

    function onCraft(Game ds, bytes24, /*entity*/ bytes24 buildingInstanceID, bytes24 itemID, uint64 /*itemQty*/ )
        external
        override
    {
        // crafting building owner and cocktail owner must match
        State state = ds.getState();
        bytes24 buildingKind = state.getBuildingKind(buildingInstanceID);
        bytes24 buildingKindOwner = state.getOwner(buildingKind);
        bytes24 itemKind = itemID;
        bytes24 itemKindOwner = state.getOwner(itemKind);
        require(
            itemKindOwner == buildingKindOwner,
            "crafting this item is restricted to building kinds made by the item owner"
        );
    }

    function onExtract(
        Game, /*ds*/
        bytes24, /*entity*/
        bytes24, /*buildingInstanceID*/
        bytes24, /*itemID*/
        uint64 /*itemQty*/
    ) external pure override {
        revert("cannot extract cocktails");
    }

    function onSpawn(Game, /*ds*/ bytes24, /*zoneOwner*/ bytes24, /*zoneID*/ bytes24, /*itemID*/ uint64 /*itemQty*/ )
        external
        pure
        override
    {
        revert("cannot spawn cocktails");
    }

    function onReward(Game, /*ds*/ bytes24, /*winner*/ bytes24, /*sessionID*/ bytes24, /*itemID*/ uint64 /*itemQty*/ )
        external
        pure
        override
    {
        revert("cocktail spilt during combat");
    }
}
