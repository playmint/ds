// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, Rel, Kind, GooVal, LogicCellState} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract Start is BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public {
        State state = ds.getState();

        LogicCellState[] memory cellStates = new LogicCellState[](20);

        for (uint8 i = 0; i <= 255; i++) {
            (bytes24 logicCell,) = state.get(Rel.LogicCellTrigger.selector, i, buildingInstance);
            if (logicCell == bytes24(0)) {
                break;
            }

            LogicCellState memory cellState = getCellState(state, cellStates, logicCell);
            if (cellState.filledInputCount == cellState.inputCount) {
                executeLogicCell(state, logicCell, cellState, cellStates);
            }
        }
    }

    function executeLogicCell(
        State state,
        bytes24 logicCell,
        LogicCellState memory cellState,
        LogicCellState[] memory cellStates
    ) private {
        GooVal[] memory output = new GooVal[](5); //logicCell.execute(state, cellState.input);

        for (uint8 i = 0; i <= 255; i++) {
            (bytes24 nextLogicCell, uint64 inputIndex) = state.get(Rel.GooPipe.selector, i, logicCell);
            if (nextLogicCell == bytes24(0)) {
                break;
            }
            LogicCellState memory nextCellState = getCellState(state, cellStates, nextLogicCell);
            nextCellState.input[inputIndex] = output[i];
            nextCellState.filledInputCount++;

            if (nextCellState.filledInputCount == nextCellState.inputCount) {
                executeLogicCell(state, nextLogicCell, nextCellState, cellStates);
                nextCellState.filledInputCount = 0; // NOTE: We don't actually bother clearing the array
            }
        }
    }

    function getCellState(State state, LogicCellState[] memory cellStates, bytes24 logicCell)
        private
        view
        returns (LogicCellState memory)
    {
        for (uint256 i = 0; i < cellStates.length; i++) {
            LogicCellState memory cellState = cellStates[i];
            if (cellState.logicCell == logicCell) {
                return cellState;
            }
            if (cellState.logicCell == bytes24(0)) {
                cellState.logicCell = logicCell;
                ( /*bytes24*/ , uint64 inputCount) = state.get(Rel.Balance.selector, 0, logicCell);
                cellState.inputCount = uint8(inputCount);
                cellState.input = new GooVal[](inputCount);

                return cellState;
            }
        }

        revert("Out of LogicCellState memory");
    }
}
