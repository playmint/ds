// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import "@ds/utils/LibString.sol";

using Schema for State;

contract BasicFactory is BuildingKind {

    // storage data - contract variables for now (need also writing to description)
    //              - become building data when that's supported
    // list or map of units in each team and whether or not they've claimed
    // e.g. map of ids that are playing and have not claimed
    bytes24 private team1Units;
    // team2Units
    
    // uint256 endBlock;
    // bool gameActive = false;
    uint64 lastKnownPrizeBalance = 0;

    // consts
    // prize bag info
    uint8 constant prizeBagSlot = 0;
    uint8 constant prizeItemSlot = 0;
    uint64 constant joinFee = 10;

    function join() external {}
    function claim() external {}

    function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes memory payload ) public {
        State state = GetState(ds);

        if ((bytes4)(payload) == this.join.selector) {
            _join(state, actor, buildingInstance);
        }
        else if ((bytes4)(payload) == this.claim.selector) {
            _claim(ds, state, actor, buildingInstance);
        }
        // decode payload and call one of _join, _start, _claim or _reset§

        // write state to description for now
        string memory annotation = string(abi.encodePacked(
                LibString.toString(uint256(bytes32(team1Units)))
            ));
        bytes24 buildingkind = state.getBuildingKind(buildingInstance);
        state.annotate(
            buildingkind, 
            "description", 
            annotation);
    }

    function _join(State state, bytes24 unitId, bytes24 buildingId) private {
        // check game not in progress
        
        // verify payment has been made
        uint64 currentPrizeBalance = _getPrizeBalance(state, buildingId);
        if ((currentPrizeBalance - joinFee) < lastKnownPrizeBalance) {
            revert("Fee not paid");
        }
        lastKnownPrizeBalance = currentPrizeBalance;
        
        // todo - how do we determine which slot the payment is in
        // todo - decide which bag IDs and slots the fees/prize money is stored in

        // assign a team
        // todo - decide how to allocate teams - flip flop ? or count and assign ?
        // set contract vars and write to description
        if (team1Units == unitId) {
            revert("aleady joined");
        }

        if (team1Units != 0) {
            revert("game full");
        }
        team1Units = unitId;
    }

    function _start(uint24 team1BuildingID, uint24 team2BuildingId) private {

        // check teams have at least one each
        
        // set endblock to now plus 10 minutes
        // todo do we take time as a param
        // either 
        //endBlock = block.number + 10 * 60 * 30;
        // or
        //uint256 endBlock = block.number + 10 * 60 * 30;
        //state.setData(buildingId, "endBlock", endblock);

        // gameActive

        // set team buildings
    }

    function _claim(Game ds, State state, bytes24 unitId, bytes24 buildingId) private {

        // check game finished
        //if (endBlock > block.number)
        //    revert("Game running");

        // check unit in a team
        // check unit not already claimed
        require(team1Units == unitId, "Unit did not play or has already claimed");

        // count buildings for each team

        // check unit is in winning team

        // todo - decide what to do in a draw. no claims so prize pool increases for next game? everyone gets money back in draw
        // todo - decide if the building keeps money

        // award prize (total / number of winning team mates)
        // _transferFromMobileUnit (see tests code for something to copy)

        bytes24 bagId = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingId)))));
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.TRANSFER_ITEM_MOBILE_UNIT,
                (unitId, [buildingId, unitId], [prizeBagSlot, 0], [prizeItemSlot, 0], bagId, joinFee)));
        lastKnownPrizeBalance = _getPrizeBalance(state, buildingId);
        
        // mark unit as claimed
        team1Units = 0;
    }

    function _reset() private {
        // todo - do we check if all claims have been made ?
        
        // set state to joining (gameActive ?)
    }

    function _getPrizeBalance(State state, bytes24 buildingId) internal view returns (uint64) {
        bytes24 prizeBag = state.getEquipSlot(buildingId, prizeBagSlot);
        (, uint64 balance) = state.getItemSlot(prizeBag, prizeItemSlot);
        return balance;
    }

    // version of use that restricts crafting to building owner, author or allow list
    // these restrictions will not be reflected in the UI unless you make
    // similar changes in BasicFactory.js
    /*function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes memory ) public {
        State state = GetState(ds);
        CheckIsFriendlyUnit(state, actor, buildingInstance);

        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
    }*/

    // version of use that restricts crafting to units carrying a certain item
    /*function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes memory ) public {
        // require carrying an idCard
        // you can change idCardItemId to another item id
        CheckIsCarryingItem(state, actor, idCardItemId);
    
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
    }*/

    function GetState(Game ds) internal returns (State) {
        return ds.getState();
    }

    function GetBuildingOwner(State state, bytes24 buildingInstance) internal view returns (bytes24) {
        return state.getOwner(buildingInstance);
    }

    function GetBuildingAuthor(State state, bytes24 buildingInstance) internal view returns (bytes24) {
        bytes24 buildingKind = state.getBuildingKind(buildingInstance);
        return state.getOwner(buildingKind);
    }

    function CheckIsFriendlyUnit(State state, bytes24 actor, bytes24 buildingInstance) internal view {
        require(
            UnitOwnsBuilding(state, actor, buildingInstance) || UnitAuthoredBuilding(state, actor, buildingInstance)
                || UnitOwnedByFriendlyPlayer(state, actor),
            "Unit does not have permission to use this building"
        );
    }

    function UnitOwnsBuilding(State state, bytes24 actor, bytes24 buildingInstance) internal view returns (bool) {
        return state.getOwner(actor) == GetBuildingOwner(state, buildingInstance);
    }

    function UnitAuthoredBuilding(State state, bytes24 actor, bytes24 buildingInstance) internal view returns (bool) {
        return state.getOwner(actor) == GetBuildingAuthor(state, buildingInstance);
    }

    address[] private friendlyPlayerAddresses = [0x402462EefC217bf2cf4E6814395E1b61EA4c43F7];

    function UnitOwnedByFriendlyPlayer(State state, bytes24 actor) internal view returns (bool) {
        address ownerAddress = state.getOwnerAddress(actor);
        for (uint256 i = 0; i < friendlyPlayerAddresses.length; i++) {
            if (friendlyPlayerAddresses[i] == ownerAddress) {
                return true;
            }
        }
        return false;
    }

    // use cli command 'ds get items' for all current possible ids.
    bytes24 idCardItemId = 0x6a7a67f0b29554460000000100000064000000640000004c;

    function CheckIsCarryingItem(State state, bytes24 actor, bytes24 item) internal view {
        require((UnitIsCarryingItem(state, actor, item)), "Unit must be carrying specified item");
    }

    function UnitIsCarryingItem(State state, bytes24 actor, bytes24 item) internal view returns (bool) {
        for (uint8 bagIndex = 0; bagIndex < 2; bagIndex++) {
            bytes24 bag = state.getEquipSlot(actor, bagIndex);
            if (bag != 0) {
                for (uint8 slot = 0; slot < 4; slot++) {
                    (bytes24 resource, /*uint64 balance*/ ) = state.getItemSlot(bag, slot);
                    if (resource == item) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
}
