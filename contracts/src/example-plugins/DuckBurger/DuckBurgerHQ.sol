// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Dispatcher} from "cog/IDispatcher.sol";
import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, Node, DEFAULT_ZONE, Q, R, S, Kind} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import "@ds/utils/LibString.sol";

using Schema for State;

contract DuckBurgerHQ is BuildingKind {
    // todo - storing contract members like this is per BuildingKind
    // to work with building instances and therefore allow multiple buildings
    // this data should be stored either as a map to buildingInstance
    // or only use SET_DATA_ON_BUILDING action
    bytes24[] private teamDuckUnits;
    bytes24[] private teamBurgerUnits;

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

    function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes calldata payload) public {
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

        ds.getDispatcher().dispatch(
            abi.encodeCall(
                Actions.SET_DATA_ON_BUILDING, (buildingInstance, "prizePool", bytes32(uint256(_calculatePool())))
            )
        );
    }

    function _join(Game ds, State state, bytes24 unitId, bytes24 buildingId) private {
        // check game not in progress
        bool gameActive = uint256(state.getData(buildingId, "gameActive")) == 1;
        if (gameActive) {
            revert("Can't join while a game is already active");
        }

        // verify payment has been made
        // this assumes the Unit has issed an action to transfer the fee in the same transaction batch as the use action
        // see DuckBurgerHQ.js join function for how this is done
        uint64 lastKnownPrizeBalance = uint64(uint256(state.getData(buildingId, "lastKnownPrizeBalance")));
        uint64 currentPrizeBalance = _getPrizeBalance(state, buildingId);
        if ((currentPrizeBalance - joinFee) < lastKnownPrizeBalance) {
            revert("Fee not paid");
        }

        // remember the new balance
        Dispatcher dispatcher = ds.getDispatcher();
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.SET_DATA_ON_BUILDING,
                (buildingId, "lastKnownPrizeBalance", bytes32(uint256(currentPrizeBalance)))
            )
        );
        
        for (uint256 i = 0; i < teamDuckUnits.length; i++) {
            if (teamDuckUnits[i] == unitId) revert("Already joined");
        }
        for (uint256 i = 0; i < teamBurgerUnits.length; i++) {
            if (teamBurgerUnits[i] == unitId) revert("Already joined");
        }

        // Assign a team
        if (teamDuckUnits.length <= teamBurgerUnits.length) {
            teamDuckUnits.push(unitId);
            assignUnitToTeam(ds, "duck", unitId, buildingId);
        } else {
            teamBurgerUnits.push(unitId);
            assignUnitToTeam(ds, "burger", unitId, buildingId);
        }
    }

    function assignUnitToTeam(Game ds, string memory team, bytes24 unitId, bytes24 buildingId) private {
        Dispatcher dispatcher = ds.getDispatcher();

        if (keccak256(abi.encodePacked(team)) == keccak256(abi.encodePacked("duck"))) {
            processTeam(dispatcher, buildingId, "teamDuck", teamDuckUnits, unitId);
        } else if (keccak256(abi.encodePacked(team)) == keccak256(abi.encodePacked("burger"))) {
            processTeam(dispatcher, buildingId, "teamBurger", teamBurgerUnits, unitId);
        }
    }

    function processTeam(
        Dispatcher dispatcher,
        bytes24 buildingId,
        string memory teamPrefix,
        bytes24[] storage teamUnits,
        bytes24 unitId
    ) private {
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.SET_DATA_ON_BUILDING,
                (buildingId, string(abi.encodePacked(teamPrefix, "Length")), bytes32(uint256(teamUnits.length)))
            )
        );

        string memory teamUnitIndex =
            string(abi.encodePacked(teamPrefix, "Unit_", LibString.toString(uint256(teamUnits.length) - 1)));

        dispatcher.dispatch(abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, teamUnitIndex, bytes32(unitId))));
    }

    function _start(Game ds, State state, bytes24 buildingId, bytes24 duckBuildingID, bytes24 burgerBuildingID)
        private
    {
        Dispatcher dispatcher = ds.getDispatcher();

        // check teams have at least one each
        uint256 teamDuckLength = uint256(state.getData(buildingId, "teamDuckLength"));
        uint256 teamBurgerLength = uint256(state.getData(buildingId, "teamBurgerLength"));
        if (teamDuckLength == 0 || teamBurgerLength == 0) {
            revert("Can't start, both teams must have at least 1 player");
        }

        // set team buildings
        dispatcher.dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "buildingKindIdDuck", bytes32(duckBuildingID)))
        );
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.SET_DATA_ON_BUILDING, (buildingId, "buildingKindIdBurger", bytes32(burgerBuildingID))
            )
        );

        // todo if the game length is a parameter, we could calculate this from the endBlock
        dispatcher.dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "startBlock", bytes32(uint256(block.number))))
        );

        // set endblock to now plus 1 minute (assuming 2 second blocks)
        // todo do we take time as a param
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.SET_DATA_ON_BUILDING, (buildingId, "endBlock", bytes32(uint256(block.number + 1 * 30)))
            )
        );

        // set start to now
        dispatcher.dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "startBlock", bytes32(uint256(block.number))))
        );

        // gameActive
        dispatcher.dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "gameActive", bytes32(uint256(1))))
        );
    }

    function _claim(Game ds, State state, bytes24 unitId, bytes24 buildingId) private {
        // check game finished
        {
            uint256 endBlock = uint256(state.getData(buildingId, "endBlock"));
            if (block.number < endBlock) {
                revert("Can't claim, game is running");
            }
        }

        // check unit in a team
        // check unit not already claimed
        bool isDuckTeamMember = false;
        bool isBurgerTeamMember = false;
        for (uint256 i = 0; i < teamDuckUnits.length; i++) {
            if (teamDuckUnits[i] == unitId) {
                isDuckTeamMember = true;
                break;
            }
        }
        for (uint256 i = 0; i < teamBurgerUnits.length; i++) {
            if (teamBurgerUnits[i] == unitId) {
                isBurgerTeamMember = true;
                break;
            }
        }
        require(isDuckTeamMember || isBurgerTeamMember, "Unit did not play or has already claimed");

        // count buildings for each team
        // NOTE: Scoped to avoid stack being too deep
        bool isDraw;
        {
            (uint24 duckBuildings, uint24 burgerBuildings) = getBuildingCounts(state, buildingId);

            // check unit is in winning team

            if (isDuckTeamMember && duckBuildings < burgerBuildings) {
                revert("You, duck, are not on the winning team: burgers");
            } else if (isBurgerTeamMember && burgerBuildings < duckBuildings) {
                revert("You, burger, are not on the winning team: ducks");
            }
            isDraw = burgerBuildings == duckBuildings;
        }

        // winner! (or drawer)
        // \todo this currently assumes even teams
        Dispatcher dispatcher = ds.getDispatcher();
        _awardPrize(state, dispatcher, buildingId, unitId, isDraw ? joinFee : _calculatePrizeAmount());

        // remember new prize balance
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.SET_DATA_ON_BUILDING,
                (buildingId, "lastKnownPrizeBalance", bytes32(uint256(_getPrizeBalance(state, buildingId))))
            )
        );

        // Remove unit from team so they can't double claim
        if (isDuckTeamMember) {
            removeUnitFromArray(teamDuckUnits, unitId);
        } else if (isBurgerTeamMember) {
            removeUnitFromArray(teamBurgerUnits, unitId);
        }
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
        dispatcher.dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "startBlock", bytes32(uint256(block.number))))
        );
        dispatcher.dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "endBlock", bytes32(uint256(block.number))))
        );
        dispatcher.dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "gameActive", bytes32(uint256(0))))
        );
        delete teamDuckUnits;
        delete teamBurgerUnits;
        dispatcher.dispatch(abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "teamBurgerLength", bytes32(0))));
        dispatcher.dispatch(abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "teamDuckLength", bytes32(0))));
        dispatcher.dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "lastKnownPrizeBalance", bytes32(0)))
        );
        dispatcher.dispatch(abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "prizePool", bytes32(0))));
        dispatcher.dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "buildingKindIdDuck", bytes32(0)))
        );
        dispatcher.dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingId, "buildingKindIdBurger", bytes32(0)))
        );
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
                DEFAULT_ZONE, coords(arenaTiles[i])[1], coords(arenaTiles[i])[2], coords(arenaTiles[i])[3]
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
}
