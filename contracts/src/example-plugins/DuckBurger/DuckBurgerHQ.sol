// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, Node, DEFAULT_ZONE, Q, R, S} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import "@ds/utils/LibString.sol";

using Schema for State;

contract BasicFactory is BuildingKind {

    // storage data - contract variables for now (need also writing to description)
    //              - become building data when that's supported
    // list or map of units in each team and whether or not they've claimed
    // e.g. map of ids that are playing and have not claimed
    bytes24[] private teamDuckUnits;
    bytes24[] private teamBurgerUnits;

    bool gameActive = false;
    uint256 endBlock = 0;
    uint64 lastKnownPrizeBalance = 0;

    // consts
    // prize bag info
    uint8 constant prizeBagSlot = 0;
    uint8 constant prizeItemSlot = 0;
    uint64 constant joinFee = 2;

    function join() external {}
    function start(uint24 duckBuildingID, uint24 burgerBuildingID) external {}
    function claim() external {}
    function reset() external {}

    function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes calldata payload ) public {
        State state = GetState(ds);

        if ((bytes4)(payload) == this.join.selector) {
            _join(state, actor, buildingInstance);
        }
        else if ((bytes4)(payload) == this.start.selector) {
            (uint24 duckBuildingID, uint24 burgerBuildingID) = abi.decode(payload[4:], (uint24, uint24));
            _start(duckBuildingID, burgerBuildingID);
        }
        else if ((bytes4)(payload) == this.claim.selector) {
            _claim(ds, state, actor, buildingInstance);
        }
        else if ((bytes4)(payload) == this.reset.selector) {
            _reset(state, buildingInstance);
        }
        // decode payload and call one of _join, _start, _claim or _reset§

        // write state to description for now
        refreshAccessibleData(state, buildingInstance);
    }

    function _join(State state, bytes24 unitId, bytes24 buildingId) private {
        // check game not in progress
        if (gameActive){
            revert("Can't join while a game is already active");
        }
        
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
        // Check if unit is already in a team
        for(uint i = 0; i < teamDuckUnits.length; i++) {
            if(teamDuckUnits[i] == unitId) revert("Already joined");
        }
        for(uint i = 0; i < teamBurgerUnits.length; i++) {
            if(teamBurgerUnits[i] == unitId) revert("Already joined");
        }

        // Assign a team
        if(teamDuckUnits.length <= teamBurgerUnits.length) {
            teamDuckUnits.push(unitId);
        } else {
            teamBurgerUnits.push(unitId);
        }
    }

    function _start(uint24 duckBuildingID, uint24 burgerBuildingID) private {

        // check teams have at least one each
        if (teamDuckUnits.length == 0 || teamBurgerUnits.length == 0) {
        revert("Can't start, both teams must have at least 1 player");
        }

        // probably set global bytes24 vars that are used in the counting 
        // function instead of needing it in start
        duckBuildingID = 0;
        burgerBuildingID = 0;
        
        // set endblock to now plus 10 minutes
        // todo do we take time as a param
        // either 
        endBlock = block.number + 1 * 30;
        // or
        //uint256 endBlock = block.number + 10 * 60 * 30;
        //state.setData(buildingId, "endBlock", endblock);

        // gameActive
        gameActive = true;

        // set team buildings
    }

    function _claim(Game ds, State state, bytes24 unitId, bytes24 buildingId) private {

        // check game finished
        //if (endBlock > block.number)
        //    revert("Game running");
        if (block.number < endBlock){
            revert("Can't claim, game is running");
        }

        // check unit in a team
        // check unit not already claimed
        bool isDuckTeamMember = false;
        bool isBurgerTeamMember = false;
        for(uint i = 0; i < teamDuckUnits.length; i++) {
            if(teamDuckUnits[i] == unitId) {
                isDuckTeamMember = true;
                break;
            }
        }
        for(uint i = 0; i < teamBurgerUnits.length; i++) {
            if(teamBurgerUnits[i] == unitId) {
                isBurgerTeamMember = true;
                break;
            }
        }
        require(isDuckTeamMember || isBurgerTeamMember, "Unit did not play or has already claimed");

        // count buildings for each team

        (uint24 duckBuildings, uint24 burgerBuildings) = getBuildingCounts(state, buildingId);

        // check unit is in winning team

        if (isDuckTeamMember && duckBuildings < burgerBuildings){
            revert("You, duck, are not on the winning team: burgers");
        } 
        else if (isBurgerTeamMember && burgerBuildings < duckBuildings){
            revert("You, burger, are not on the winning team: ducks");
        }

        bool isDraw = burgerBuildings == duckBuildings;

        // todo - decide what to do in a draw. no claims so prize pool increases for next game? everyone gets money back in draw
        // todo - decide if the building keeps money

        // award prize (total / number of winning team mates)
        // _transferFromMobileUnit (see tests code for something to copy)

        bytes24 bagId = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingId)))));
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.TRANSFER_ITEM_MOBILE_UNIT,
                (unitId, [buildingId, unitId], [prizeBagSlot, 0], [prizeItemSlot, 0], bagId, isDraw ? joinFee : _calculatePrizeAmount())));
        lastKnownPrizeBalance = _getPrizeBalance(state, buildingId);
        
        // Remove unit from team
        if (isDuckTeamMember){
            removeUnitFromArray(teamDuckUnits, unitId);
        } else if (isBurgerTeamMember){
            removeUnitFromArray(teamBurgerUnits, unitId);
        }
    }

    function removeUnitFromArray(bytes24[] storage array, bytes24 unitId) private {
        for (uint i = 0; i < array.length; i++) {
            if (array[i] == unitId) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }

    function _reset(State state, bytes24 buildingInstance) private {
        // todo - do we check if all claims have been made ?
        
        // set state to joining (gameActive ?)
        endBlock = block.number;
        gameActive = false;
        delete teamDuckUnits;
        delete teamBurgerUnits;

        refreshAccessibleData(state, buildingInstance);
    }

    function refreshAccessibleData(State state, bytes24 buildingInstance) private{
        string memory annotation = string(abi.encodePacked(
                LibString.toString(_calculatePool()),
                ", ",
                LibString.toString(gameActive ? 1 : 0),
                ", ",
                LibString.toString(endBlock)
            ));
        bytes24 buildingkind = state.getBuildingKind(buildingInstance);
        state.annotate(
            buildingkind, 
            "description", 
            annotation);
    }

    function _getPrizeBalance(State state, bytes24 buildingId) internal view returns (uint64) {
        bytes24 prizeBag = state.getEquipSlot(buildingId, prizeBagSlot);
        (, uint64 balance) = state.getItemSlot(prizeBag, prizeItemSlot);
        return balance;
    }

    function _calculatePrizeAmount() internal pure returns (uint64) {
        return joinFee * 2;
    }

    function _calculatePool() internal view returns (uint64) {
        return uint64(teamDuckUnits.length + teamBurgerUnits.length) * joinFee;
    }


    function getBuildingCounts(State state, bytes24 buildingInstance) public view returns (uint24, uint24) {
        // If these don't come from js, maybe make a duck and burger building in example plugins and use those ids
        bytes24 DUCK_BUILDING_KIND = 0xbe92755c0000000000000000dd0661c00000000000000003;
        bytes24 BURGER_BUILDING_KIND = 0xbe92755c000000000000000043d0a0250000000000000003;

        uint24 ducks = 0;
        uint24 burgers = 0;

        bytes24 tile = state.getFixedLocation(buildingInstance);
        bytes24[99] memory arenaTiles = range5(tile);
        for (uint256 i = 0; i < arenaTiles.length; i++) {
            bytes24 arenaBuildingID = Node.Building(DEFAULT_ZONE, coords(arenaTiles[i])[1], coords(arenaTiles[i])[2], coords(arenaTiles[i])[3]);
            if (state.getBuildingKind(arenaBuildingID) == DUCK_BUILDING_KIND) {
                ducks++;
            } else if (state.getBuildingKind(arenaBuildingID) == BURGER_BUILDING_KIND) {
                burgers++;
            }
        }
        return (ducks, burgers);
    }

    function coords(bytes24 tile) internal pure returns (int16[4] memory keys) {
        keys = CompoundKeyDecoder.INT16_ARRAY(tile);
    }

    function range5(bytes24 tile) internal pure returns (bytes24[99] memory results) {
        int16 range = 5;
        int16[4] memory tileCoords = coords(tile);
        uint256 i = 0;
        for (int16 q = tileCoords[1] - range; q <= tileCoords[1] + range; q++) {
            for (int16 r = tileCoords[2] - range; r <= tileCoords[2] + range; r++) {
                int16 s = -q - r;
                bytes24 nextTile = Node.Tile(0, q, r, s);
                if (distance(tile, nextTile) <= uint256(uint16(range))) {
                    results[i] = nextTile;
                    i++;
                }
            }
        }
        return results;
    }

    function distance(bytes24 tileA, bytes24 tileB) internal pure returns (uint256) {
        int16[4] memory a = CompoundKeyDecoder.INT16_ARRAY(tileA);
        int16[4] memory b = CompoundKeyDecoder.INT16_ARRAY(tileB);
        return uint256(
            (abs(int256(a[Q]) - int256(b[Q])) + abs(int256(a[R]) - int256(b[R])) + abs(int256(a[S]) - int256(b[S]))) / 2
        );
    }

    function abs(int256 n) internal pure returns (int256) {
        return n >= 0 ? n : -n;
    }

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
