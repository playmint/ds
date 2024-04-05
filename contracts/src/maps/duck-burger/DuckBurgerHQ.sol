// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Dispatcher} from "cog/IDispatcher.sol";
import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, Node, Q, R, S, Kind} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import "@ds/utils/LibString.sol";

using Schema for State;

contract DuckBurgerHQ is BuildingKind {
    // consts
    // prize bag info
    uint8 constant prizeBagSlot = 0;
    uint8 constant prizeItemSlot = 0;
    uint64 constant joinFee = 2;

    // function declerations only used to create signatures for the use payload
    // these functions do not have their own definitions
    function join() external {}
    function start(bytes24 duckBuildingID, bytes24 burgerBuildingID) external {}
    function claim() external {}
    function reset() external {}

    function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes calldata payload) public override {
        State state = GetState(ds);

        // decode payload and call one of _join, _start, _claim or _reset
        if ((bytes4)(payload) == this.join.selector) {
            _join(ds, state, actor, buildingInstance);
        } else if ((bytes4)(payload) == this.start.selector) {
            (bytes24 duckBuildingID, bytes24 burgerBuildingID) = abi.decode(payload[4:], (bytes24, bytes24));
            _start(ds, state, buildingInstance, duckBuildingID, burgerBuildingID);
        } else if ((bytes4)(payload) == this.claim.selector) {
            _claim(ds, state, actor, buildingInstance);
        } else if ((bytes4)(payload) == this.reset.selector) {
            _reset(ds, buildingInstance);
        }

        _setDataOnBuilding(
            ds.getDispatcher(), buildingInstance, "prizePool", bytes32(uint256(_calculatePool(state, buildingInstance)))
        );
    }

    function _join(Game ds, State state, bytes24 unitId, bytes24 buildingId) private {
        // check game not in progress
        if (uint256(state.getData(buildingId, "gameActive")) == 1) revert("Game active");

        // verify payment has been made
        // this assumes the Unit has issed an action to transfer the fee in the same transaction batch as the use action
        // see DuckBurgerHQ.js join function for how this is done
        uint64 lastKnownPrizeBalance = uint64(uint256(state.getData(buildingId, "lastKnownPrizeBalance")));
        uint64 currentPrizeBalance = _getPrizeBalance(state, buildingId);
        if (currentPrizeBalance - joinFee < lastKnownPrizeBalance) revert("Fee unpaid");

        // remember the new balance
        _setDataOnBuilding(
            ds.getDispatcher(), buildingId, "lastKnownPrizeBalance", bytes32(uint256(currentPrizeBalance))
        );

        // Check if unit has already joined
        if (
            isUnitInTeam(state, buildingId, "teamDuck", unitId) || isUnitInTeam(state, buildingId, "teamBurger", unitId)
        ) {
            revert("Already joined");
        }

        uint64 teamDuckLength = uint64(uint256(state.getData(buildingId, "teamDuckLength")));
        uint64 teamBurgerLength = uint64(uint256(state.getData(buildingId, "teamBurgerLength")));

        // assign a team
        assignUnitToTeam(
            ds,
            (teamDuckLength <= teamBurgerLength) ? "duck" : "burger",
            (teamDuckLength <= teamBurgerLength) ? teamDuckLength : teamBurgerLength,
            unitId,
            buildingId
        );
    }

    function isUnitInTeam(State state, bytes24 buildingId, string memory teamPrefix, bytes24 unitId)
        private
        view
        returns (bool)
    {
        uint64 teamLength = uint64(uint256(state.getData(buildingId, string(abi.encodePacked(teamPrefix, "Length")))));
        // check every slot for unit id
        for (uint64 i = 0; i < teamLength; i++) {
            string memory teamUnitIndex = string(abi.encodePacked(teamPrefix, "Unit_", LibString.toString(i)));
            if (bytes24(state.getData(buildingId, teamUnitIndex)) == unitId) {
                return true;
            }
        }
        return false;
    }

    function assignUnitToTeam(Game ds, string memory team, uint64 teamLength, bytes24 unitId, bytes24 buildingId)
        private
    {
        Dispatcher dispatcher = ds.getDispatcher();
        if (keccak256(abi.encodePacked(team)) == keccak256(abi.encodePacked("duck"))) {
            processTeam(dispatcher, buildingId, "teamDuck", teamLength, unitId);
        } else if (keccak256(abi.encodePacked(team)) == keccak256(abi.encodePacked("burger"))) {
            processTeam(dispatcher, buildingId, "teamBurger", teamLength, unitId);
        }
    }

    function processTeam(
        Dispatcher dispatcher,
        bytes24 buildingId,
        string memory teamPrefix,
        uint64 teamLength,
        bytes24 unitId
    ) private {
        // adding to teamXUnit_X
        string memory teamUnitIndex =
            string(abi.encodePacked(teamPrefix, "Unit_", LibString.toString(uint256(teamLength))));
        _setDataOnBuilding(dispatcher, buildingId, teamUnitIndex, bytes32(unitId));
        _setDataOnBuilding(
            dispatcher, buildingId, string(abi.encodePacked(teamPrefix, "Length")), bytes32(uint256(teamLength) + 1)
        );
    }

    function _start(Game ds, State state, bytes24 buildingId, bytes24 duckBuildingID, bytes24 burgerBuildingID)
        private
    {
        uint256 teamDuckLength = uint256(state.getData(buildingId, "teamDuckLength"));
        uint256 teamBurgerLength = uint256(state.getData(buildingId, "teamBurgerLength"));
        if (teamDuckLength == 0 || teamBurgerLength == 0) revert("Teams need 1 player");

        Dispatcher dispatcher = ds.getDispatcher();
        // set team buildings

        _setDataOnBuilding(dispatcher, buildingId, "buildingKindIdDuck", duckBuildingID);
        _setDataOnBuilding(dispatcher, buildingId, "buildingKindIdBurger", burgerBuildingID);
        // todo if the game length is a parameter, we could calculate this from the endBlock
        _setDataOnBuilding(dispatcher, buildingId, "startBlock", bytes32(block.number));
        // set endblock to now plus 3 minutes (assuming 2 second blocks)
        // todo do we take time as a param
        _setDataOnBuilding(dispatcher, buildingId, "endBlock", bytes32(block.number + 3 * 30));

        // set game active
        _setDataOnBuilding(dispatcher, buildingId, "gameActive", bytes32(uint256(1)));
    }

    function _claim(Game ds, State state, bytes24 unitId, bytes24 buildingId) private {
        // check if game is finished
        if (block.number < uint256(state.getData(buildingId, "endBlock"))) {
            revert("Game running");
        }

        // check if unit is on a team (they are removed from the team upon claiming)
        bool isDuckTeamMember = isUnitInTeam(state, buildingId, "teamDuck", unitId);
        bool isBurgerTeamMember = isUnitInTeam(state, buildingId, "teamBurger", unitId);
        require(isDuckTeamMember || isBurgerTeamMember, "Not in team");

        // count buildings for each team
        (uint24 duckBuildings, uint24 burgerBuildings) = getBuildingCounts(state, buildingId);
        bool isDraw = duckBuildings == burgerBuildings;
        // stop here if unit's team lost
        if (
            isDuckTeamMember && duckBuildings < burgerBuildings || isBurgerTeamMember && burgerBuildings < duckBuildings
        ) {
            revert("Not winning team");
        }

        Dispatcher dispatcher = ds.getDispatcher();
        // calculate prize and award it
        _awardPrize(state, dispatcher, buildingId, unitId, isDraw ? joinFee : _calculatePrizeAmount());
        _setDataOnBuilding(
            dispatcher, buildingId, "lastKnownPrizeBalance", bytes32(uint256(_getPrizeBalance(state, buildingId)))
        );

        // remove unit from team now that prize has been claimed
        if (isDuckTeamMember) {
            uint64 teamDuckLength = uint64(uint256(state.getData(buildingId, "teamDuckLength")));
            uint64 unitIndex = findUnitIndex(state, "teamDuck", unitId, teamDuckLength, buildingId);
            removeUnitFromTeam(ds, state, unitIndex, teamDuckLength, "Duck", buildingId);
        } else if (isBurgerTeamMember) {
            uint64 teamBurgerLength = uint64(uint256(state.getData(buildingId, "teamBurgerLength")));
            uint64 unitIndex = findUnitIndex(state, "teamBurger", unitId, teamBurgerLength, buildingId);
            removeUnitFromTeam(ds, state, unitIndex, teamBurgerLength, "Burger", buildingId);
        }
    }

    function findUnitIndex(State state, string memory teamPrefix, bytes24 unitId, uint64 teamLength, bytes24 buildingId)
        private
        view
        returns (uint64)
    {
        for (uint64 i = 0; i < teamLength; i++) {
            string memory teamUnitKey = string(abi.encodePacked(teamPrefix, "Unit_", LibString.toString(i)));
            if (bytes24(state.getData(buildingId, teamUnitKey)) == unitId) {
                return i;
            }
        }
        revert("Unit not found");
    }

    // Generic function to handle the removal of a unit from a team
    function removeUnitFromTeam(
        Game ds,
        State state,
        uint256 unitIndex,
        uint256 teamLength,
        string memory teamType,
        bytes24 buildingId
    ) private {
        Dispatcher dispatcher = ds.getDispatcher();

        // construct the team unit key
        string memory teamUnitKey = string(abi.encodePacked("team", teamType, "Unit_", LibString.toString(unitIndex)));

        // set the team unit data to 0
        _setDataOnBuilding(dispatcher, buildingId, teamUnitKey, bytes32(0));

        // if there is more than 1 unit in the team, move the last unit to replace the current
        if (teamLength > 1) {
            string memory lastTeamUnitKey =
                string(abi.encodePacked("team", teamType, "Unit_", LibString.toString(teamLength - 1)));
            bytes24 lastUnit = bytes24(state.getData(buildingId, lastTeamUnitKey));

            // set value of where this unit was to last unit id
            _setDataOnBuilding(dispatcher, buildingId, teamUnitKey, bytes32(lastUnit));
        }

        // decrease team length
        _setDataOnBuilding(
            dispatcher, buildingId, string(abi.encodePacked("team", teamType, "Length")), bytes32(teamLength - 1)
        );
    }

    function _awardPrize(State state, Dispatcher dispatcher, bytes24 buildingId, bytes24 unitId, uint64 prizeAmount)
        private
    {
        bytes24 prizeBagId = state.getEquipSlot(buildingId, prizeBagSlot);
        (bytes24 prizeItemId, /*uint64 balance*/ ) = state.getItemSlot(prizeBagId, prizeItemSlot);

        (uint8 destBagSlot, uint8 destItemSlot) = _findValidItemSlot(state, unitId, prizeItemId, prizeAmount);

        dispatcher.dispatch(
            abi.encodeCall(
                Actions.TRANSFER_ITEM_MOBILE_UNIT,
                (
                    buildingId,
                    [buildingId, unitId],
                    [prizeBagSlot, destBagSlot],
                    [prizeItemSlot, destItemSlot],
                    bytes24(0), // To bag ID not required
                    prizeAmount
                )
            )
        );
    }

    function _findValidItemSlot(State state, bytes24 unitId, bytes24 itemId, uint64 transferAmount)
        private
        view
        returns (uint8 destBagSlot, uint8 destItemSlot)
    {
        for (destBagSlot = 0; destBagSlot < 2; destBagSlot++) {
            bytes24 destBagId = state.getEquipSlot(unitId, destBagSlot);

            require(bytes4(destBagId) == Kind.Bag.selector, "findValidItemSlot(): No bag found at equip slot");

            for (destItemSlot = 0; destItemSlot < 4; destItemSlot++) {
                (bytes24 destItemId, uint64 destBalance) = state.getItemSlot(destBagId, destItemSlot);
                if ((destItemId == bytes24(0) || destItemId == itemId) && destBalance + transferAmount <= 100) {
                    // Found valid slot
                    return (destBagSlot, destItemSlot);
                }
            }
        }

        revert("No valid slot for prize claim found");
    }

    function removeUnitFromArray(bytes24[] storage array, bytes24 unitId) private {
        for (uint256 i = 0; i < array.length; i++) {
            if (array[i] == unitId) {
                array[i] = array[array.length - 1];
                array.pop();
                break;
            }
        }
    }

    function _reset(Game ds, bytes24 buildingId) private {
        Dispatcher dispatcher = ds.getDispatcher();

        // todo - do we check if all claims have been made ?
        // for now allwing reset any time which requires some trust :)

        // set state to joining (gameActive ?)
        _setDataOnBuilding(dispatcher, buildingId, "startBlock", bytes32(block.number));
        _setDataOnBuilding(dispatcher, buildingId, "endBlock", bytes32(block.number));
        _setDataOnBuilding(dispatcher, buildingId, "gameActive", bytes32(0));
        _setDataOnBuilding(dispatcher, buildingId, "teamBurgerLength", bytes32(0));
        _setDataOnBuilding(dispatcher, buildingId, "teamDuckLength", bytes32(0));
        _setDataOnBuilding(dispatcher, buildingId, "lastKnownPrizeBalance", bytes32(0));
        _setDataOnBuilding(dispatcher, buildingId, "prizePool", bytes32(0));
        _setDataOnBuilding(dispatcher, buildingId, "buildingKindIdDuck", bytes32(0));
        _setDataOnBuilding(dispatcher, buildingId, "buildingKindIdBurger", bytes32(0));
    }

    function _getPrizeBalance(State state, bytes24 buildingId) internal view returns (uint64) {
        bytes24 prizeBag = state.getEquipSlot(buildingId, prizeBagSlot);
        (, uint64 balance) = state.getItemSlot(prizeBag, prizeItemSlot);
        return balance;
    }

    function _calculatePrizeAmount() internal pure returns (uint64) {
        return joinFee * 2;
    }

    function _calculatePool(State state, bytes24 buildingId) internal view returns (uint64) {
        uint64 teamDuckLength = uint64(uint256(state.getData(buildingId, "teamDuckLength")));
        uint64 teamBurgerLength = uint64(uint256(state.getData(buildingId, "teamBurgerLength")));
        return uint64(teamDuckLength + teamBurgerLength) * joinFee;
    }

    function getBuildingCounts(State state, bytes24 buildingInstance)
        public
        view
        returns (uint24 ducks, uint24 burgers)
    {
        bytes24 duckBuildingKind = bytes24(state.getData(buildingInstance, "buildingKindIdDuck"));
        bytes24 burgerBuildingKind = bytes24(state.getData(buildingInstance, "buildingKindIdBurger"));
        uint256 endBlock = uint256(state.getData(buildingInstance, "endBlock"));
        uint256 startBlock = uint256(state.getData(buildingInstance, "startBlock"));

        bytes24 tile = state.getFixedLocation(buildingInstance);
        bytes24[99] memory arenaTiles = range5(tile);
        for (uint256 i = 0; i < arenaTiles.length; i++) {
            bytes24 arenaBuildingID = Node.Building(
                coords(arenaTiles[i])[0], coords(arenaTiles[i])[1], coords(arenaTiles[i])[2], coords(arenaTiles[i])[3]
            );
            if (state.getBuildingKind(arenaBuildingID) == duckBuildingKind) {
                uint64 constructionBlockNum = state.getBuildingConstructionBlockNum(arenaBuildingID);
                if (constructionBlockNum >= startBlock && constructionBlockNum <= endBlock) {
                    ducks++;
                }
            } else if (state.getBuildingKind(arenaBuildingID) == burgerBuildingKind) {
                uint64 constructionBlockNum = state.getBuildingConstructionBlockNum(arenaBuildingID);
                if (constructionBlockNum >= startBlock && constructionBlockNum <= endBlock) {
                    burgers++;
                }
            }
        }
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
                bytes24 nextTile = Node.Tile(tileCoords[0], q, r, s);
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

    function _setDataOnBuilding(Dispatcher dispatcher, bytes24 buildingId, string memory key, bytes32 value) internal {
        dispatcher.dispatch(abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, key, value)));
    }
}
