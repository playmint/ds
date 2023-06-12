import { WorldTileFragment } from '@dawnseekers/core';
import { AbiCoder, BigNumberish, BytesLike } from 'ethers';
import { CombatAction } from '@app/plugins/combat/combat';

export const buildingRegex = /^0x34cf8a7e[0-9a-f]+$/g;
export const seekerRegex = /^0x3fbc56a4[0-9a-f]+$/g;
export const nodeKindMask = BigInt('0xffffffff');
export const buildingNodeKind = BigInt('0x34cf8a7e');

export type CombatSession = WorldTileFragment['sessions'][number];

// NOTE: I wasn't able to import this from core as the namespace wasn't exported. Not sure how to fix
export type CombatActionStruct = {
    kind: BigNumberish;
    entityID: BytesLike;
    blockNum: BigNumberish;
    data: BytesLike;
};

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
    const sessionUpdates = session.sessionUpdates
        .sort((a, b) => {
            if (!a || !b) return 0;
            const actionNumA = BigInt(a.name.split('-')[1]);
            const actionNumB = BigInt(b.name.split('-')[1]);
            return Number(actionNumA - actionNumB);
        })
        .map((actionUpdate) => {
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

export function convertCombatActions(actions: CombatActionStruct[][]): CombatAction[][] {
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
