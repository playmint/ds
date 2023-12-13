// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, GooVal, GOO_GREEN, GOO_BLUE, GOO_RED, Rel, Node} from "@ds/schema/Schema.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {ILogicCell} from "@ds/ext/ILogicCell.sol";

using Schema for State;

contract Buffer is BuildingKind, ILogicCell {
    uint8 constant BUFFER_GOO_OFFSET = 1;
    uint8 constant TARGET_GOO_OFFSET = BUFFER_GOO_OFFSET + 3;

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public {}

    function execute(State state, bytes24 logicCell, GooVal[] memory input) public returns (GooVal[] memory output) {
        require(input.length == 1, "buffer: Requires 1 input1");

        // TODO: Allow these to be set via `use` above
        ( /*bytes24*/ , uint64 targetG) = state.get(Rel.Balance.selector, GOO_GREEN + TARGET_GOO_OFFSET, logicCell);
        ( /*bytes24*/ , uint64 targetB) = state.get(Rel.Balance.selector, GOO_BLUE + TARGET_GOO_OFFSET, logicCell);
        ( /*bytes24*/ , uint64 targetR) = state.get(Rel.Balance.selector, GOO_RED + TARGET_GOO_OFFSET, logicCell);

        // HACK: Hard coded override
        targetG = 2;
        targetB = 0;
        targetR = 2;

        // TODO: require that buffer is set to output more than zero on one colour?

        // Get buffer
        ( /*bytes24*/ , uint64 g) = state.get(Rel.Balance.selector, GOO_GREEN + BUFFER_GOO_OFFSET, logicCell);
        ( /*bytes24*/ , uint64 b) = state.get(Rel.Balance.selector, GOO_BLUE + BUFFER_GOO_OFFSET, logicCell);
        ( /*bytes24*/ , uint64 r) = state.get(Rel.Balance.selector, GOO_RED + BUFFER_GOO_OFFSET, logicCell);

        g += input[0].g;
        b += input[0].b;
        r += input[0].r;

        output = new GooVal[](1);

        if (g >= targetG && b >= targetB && r >= targetR) {
            // Clear buffer
            state.set(Rel.Balance.selector, GOO_GREEN + BUFFER_GOO_OFFSET, logicCell, Node.Atom(GOO_GREEN), 0);
            state.set(Rel.Balance.selector, GOO_BLUE + BUFFER_GOO_OFFSET, logicCell, Node.Atom(GOO_BLUE), 0);
            state.set(Rel.Balance.selector, GOO_RED + BUFFER_GOO_OFFSET, logicCell, Node.Atom(GOO_RED), 0);

            output[0] = GooVal({r: targetR, g: targetG, b: targetB});
            return output;
        }

        // Store the buffer on chain
        // TODO: Don't re-write value if particular colour is already at target
        state.set(
            Rel.Balance.selector,
            GOO_GREEN + BUFFER_GOO_OFFSET,
            logicCell,
            Node.Atom(GOO_GREEN),
            g > targetG ? targetG : g
        );
        state.set(
            Rel.Balance.selector,
            GOO_BLUE + BUFFER_GOO_OFFSET,
            logicCell,
            Node.Atom(GOO_BLUE),
            b > targetB ? targetB : b
        );
        state.set(
            Rel.Balance.selector, GOO_RED + BUFFER_GOO_OFFSET, logicCell, Node.Atom(GOO_RED), r > targetR ? targetR : r
        );

        // Output will be zero
        return output;
    }
}
