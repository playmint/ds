/** @format */

import { Fragment, FunctionComponent, useEffect, useState } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './combat-summary.styles';
import { AbiCoder, BytesLike, BigNumberish } from 'ethers';
import {
    CogAction,
    ConnectedPlayer,
    SelectedSeekerFragment,
    SelectedTileFragment,
    WorldTileFragment
} from '@app/../../core/dist/core';
import { CombatAction, Combat, ATOM_LIFE, CombatWinState } from '@app/helpers/combat';
import { Bag } from '../inventory/bag';

type CombatSession = WorldTileFragment['sessions'][number];

// NOTE: I wasn't able to import this from core as the namespace wasn't exported. Not sure how to fix
type CombatActionStruct = {
    kind: BigNumberish;
    entityID: BytesLike;
    blockNum: BigNumberish;
    data: BytesLike;
};

export interface CombatSummaryProps extends ComponentProps {
    selectedTiles: SelectedTileFragment[];
    block: number;
    player?: ConnectedPlayer;
    selectedSeeker?: SelectedSeekerFragment;
}

const StyledCombatSummary = styled('div')`
    ${styles}
`;

export function getActionsFlat(session: CombatSession): CombatActionStruct[] {
    // A sessionUpdate is an array of actions
    const sessionUpdates = session.sessionUpdates.map((actionUpdate) => {
        if (!actionUpdate) return null;

        const binaryString = atob(actionUpdate.value);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const decoder = AbiCoder.defaultAbiCoder();
        // TODO: I'm not sure why the decoder is putting my array of tuples in a one element array.
        //       Bad feelin this'll bite me later
        //
        // NOTE: The tuple is actually a struct
        // struct CombatAction {
        //     CombatActionKind kind;
        //     bytes24 entityID; // Can be seeker or building
        //     uint64 blockNum;
        //     bytes data;
        // }
        return decoder.decode(['tuple(uint8,bytes24,uint64,bytes)[]'], bytes)[0];
    });

    const actions = sessionUpdates.flatMap((actionTuples): CombatActionStruct => {
        // Turn the tuples back into structs
        return actionTuples.map((actionTuple: any) => {
            const [actionKind, entityID, blockNum, data] = actionTuple;
            return {
                actionKind,
                entityID,
                blockNum,
                data
            };
        });
    });

    return actions;
}

export function getActions(session: CombatSession) {
    // A sessionUpdate is an array of actions
    const sessionUpdates = session.sessionUpdates.map((actionUpdate) => {
        if (!actionUpdate) return null;

        const binaryString = atob(actionUpdate.value);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }

        const decoder = AbiCoder.defaultAbiCoder();
        return decoder.decode(['tuple(uint8,bytes24,uint64,bytes)[]'], bytes)[0];
    });

    const actions = sessionUpdates.map((actionTuples): CombatActionStruct[] => {
        // Turn the tuples back into structs
        return actionTuples.map((actionTuple: any): CombatActionStruct => {
            const [kind, entityID, blockNum, data] = actionTuple;
            return {
                kind,
                entityID,
                blockNum,
                data
            };
        });
    });

    return actions;
}

function convertCombatActions(actions: CombatActionStruct[][]): CombatAction[][] {
    const convertedActions: CombatAction[][] = [];

    for (let i = 0; i < actions.length; i++) {
        const row: CombatAction[] = [];

        for (let j = 0; j < actions[i].length; j++) {
            const actionStruct = actions[i][j];

            const convertedAction: CombatAction = {
                kind: Number(actionStruct.kind),
                entityID: actionStruct.entityID,
                blockNum: Number(actionStruct.blockNum),
                data: actionStruct.data
            };

            row.push(convertedAction);
        }

        convertedActions.push(row);
    }

    return convertedActions;
}

function getWinState(winState: CombatWinState): string {
    switch (winState) {
        case CombatWinState.ATTACKERS:
            return 'Attackers have won';
        case CombatWinState.DEFENDERS:
            return 'Defenders have won';
        case CombatWinState.DRAW:
            return 'Draw';
    }

    return 'Tile in combat';
}

const BLOCK_TIME_SECS = 2;

export const CombatSummary: FunctionComponent<CombatSummaryProps> = (props: CombatSummaryProps) => {
    const { selectedTiles, block, player, selectedSeeker, ...otherProps } = props;
    const latestSession =
        selectedTiles.length > 0 &&
        selectedTiles[0].sessions.length > 0 &&
        selectedTiles[0].sessions.sort((a, b) => {
            return a.attackTile && b.attackTile ? b.attackTile.startBlock - a.attackTile.startBlock : 0;
        })[0];
    const rewardBags =
        latestSession && selectedSeeker
            ? latestSession.bags.filter((equipSlot) => {
                  // reward containing bags have an ID that is made up of 16bits of sessionID and 48bits of SeekerID
                  // bagIDs are 64bits
                  const seekerIdMask = BigInt('0xFFFFFFFFFFFF'); // 48bit mask (6 bytes)
                  const bagSeekerID = (BigInt(equipSlot.bag.id) >> BigInt(16)) & seekerIdMask;
                  const truncatedSeekerID = BigInt(selectedSeeker.id) & seekerIdMask;
                  return bagSeekerID === truncatedSeekerID;
              })
            : [];

    const actions = latestSession ? getActions(latestSession) : [];
    const isAttackTile = latestSession && latestSession.attackTile?.tile.id == selectedTiles[0].id;
    const [lastBlock, updateLastBlock] = useState<number>(0);
    const [lastBlockTime, updateLastBlockTime] = useState<number>(0);
    const [estimatedBlock, updateEstimatedBlock] = useState<number>(0);

    useEffect(() => {
        if (block > lastBlock) {
            const nowTime = new Date().getTime() / 1000;
            updateLastBlock(block);
            updateLastBlockTime(nowTime);

            console.log('TIME UPDATED: ', nowTime);
        }
    }, [block, lastBlock]);

    useEffect(() => {
        const id = setInterval(() => {
            const nowTime = new Date().getTime() / 1000;
            const elapsed = nowTime - lastBlockTime;
            const newBlocks = Math.floor(elapsed / BLOCK_TIME_SECS);
            updateEstimatedBlock(block + newBlocks);
        }, BLOCK_TIME_SECS);
        return () => clearInterval(id);
    }, [block, lastBlockTime]);

    const convertedActions = convertCombatActions(actions);
    const combat = new Combat(); // Is a class because it was converted from solidity
    const orderedListIndexes = combat.getOrderedListIndexes(convertedActions);
    const combatState = combat.calcCombatState(convertedActions, orderedListIndexes, estimatedBlock);
    const entityStates = isAttackTile ? combatState.attackerStates : combatState.defenderStates;

    const totalTileHealth = entityStates.reduce((acc, val) => (val.isPresent ? acc + val.stats[ATOM_LIFE] : acc), 0);
    const totalTileDamage = entityStates.reduce((acc, val) => (val.isPresent ? acc + val.damage : acc), 0);
    const totalPresentAliveEntities = entityStates.reduce(
        (acc, val) => acc + (!val.isDead && val.isPresent ? 1 : 0),
        0
    );

    // Finalise the combat session if it has been calculated as finished
    useEffect(() => {
        if (latestSession && !latestSession.isFinalised && player && combatState.winState != CombatWinState.NONE) {
            console.log('Finalising session');
            // function FINALISE_COMBAT(
            //     bytes24 sessionID,
            //     CombatRule.CombatAction[][] calldata sessionUpdates,
            //     uint32[] calldata sortedListIndexes
            // ) external;
            const action: CogAction = {
                name: 'FINALISE_COMBAT',
                args: [latestSession.id, actions, orderedListIndexes]
            };
            player.dispatch(action);
        }
    }, [latestSession, actions, orderedListIndexes, player, combatState.winState]);

    return (
        <StyledCombatSummary {...otherProps}>
            <h3>Tile in Combat</h3>
            {actions && (
                <Fragment>
                    <p>
                        {isAttackTile ? 'Attackers: ' : 'Defenders: '}
                        {totalPresentAliveEntities}
                    </p>
                    <p>Current block: {block}</p>
                    <p>Current block estimate: {estimatedBlock}</p>
                    <p>Current tick: {combatState.tickCount}</p>
                    <p>
                        Health: {Math.max(totalTileHealth - totalTileDamage, 0)} / {totalTileHealth}
                    </p>
                    <p>Combat state: {getWinState(combatState.winState)}</p>
                    <ul className="bags">
                        {latestSession &&
                            rewardBags.length > 0 &&
                            rewardBags.map((equipSlot) => (
                                <Bag
                                    key={equipSlot.key}
                                    bag={equipSlot.bag}
                                    equipIndex={equipSlot.key}
                                    ownerId={latestSession.id}
                                    isInteractable={true}
                                    as="li"
                                />
                            ))}
                    </ul>
                </Fragment>
            )}
        </StyledCombatSummary>
    );
};
