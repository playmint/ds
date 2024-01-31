import { z } from 'zod';
import {
    ActionArg,
    DoIncStateSpec,
    DoSpec,
    LogicSpec,
    PartKindSpec,
    ValueFromLiteral,
    ValueFromSpec,
} from './manifest';

// TODO: Should args always be an array?
export function genArgType(arg: z.infer<typeof ActionArg>, includeStorageType: boolean = false): string {
    return `${arg.type}${arg.list ? `[${arg.length}] ${includeStorageType ? `memory` : ``}` : ``}`;
}

export function generateValueFromActionTrigger(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    _logicIndex: number,
    valueSpec: z.infer<typeof ValueFromSpec>
): string {
    if (logicSpec.when.kind != 'action') {
        throw new Error(`not an action trigger`);
    }
    if (valueSpec.kind != 'trigger') {
        throw new Error(`generateValueFromActionTrigger called on a non trigger valueSpec`);
    }
    const actionOfTrigger = (spec.actions || []).find(
        (action) => logicSpec.when.kind === 'action' && action.name === logicSpec.when.name
    );
    if (!actionOfTrigger) {
        throw new Error(`no action found with name ${logicSpec.when.name}`);
    }
    if (!actionOfTrigger.args) {
        throw new Error(`no args defined for action with name ${logicSpec.when.name}`);
    }
    const triggerArg = actionOfTrigger.args.find((arg) => valueSpec.kind === 'trigger' && arg.name === valueSpec.name);
    if (!triggerArg) {
        throw new Error(`cannot find arg with name ${valueSpec.name} on action ${actionOfTrigger.name}`);
    }
    const triggerArgIndex = actionOfTrigger.args?.indexOf(triggerArg);
    return `trigger_arg_${triggerArgIndex}${triggerArg.list ? `[${valueSpec.index}]` : ``}`;
}

export function generateValueFromLiteral(valueSpec: z.infer<typeof ValueFromLiteral>): string {
    return `${valueSpec.type}(${valueSpec.value})`;
}

export function generateValueFrom(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    valueSpec: z.infer<typeof ValueFromSpec>
): string {
    switch (valueSpec.kind) {
        case 'trigger':
            return generateValueFromActionTrigger(spec, logicSpec, logicIndex, valueSpec);
        case 'literal':
            return generateValueFromLiteral(valueSpec);
        default:
            throw new Error(`cannot get value from ${valueSpec.kind}: not implemented yet`);
    }
}

export function generateSetStateDoBlock(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    doSpec: z.infer<typeof DoSpec>,
    _doIndex: number
): string {
    // const stateVariableDef = (spec.state || []).find((stateSpec) => stateSpec.name === doSpec.name);
    const stateVariableIndex = (spec.state || []).findIndex((stateSpec) => stateSpec.name === doSpec.name);
    return `setStateValue(ds, partId, ${stateVariableIndex}, ${doSpec.index}, ${generateValueFrom(
        spec,
        logicSpec,
        logicIndex,
        doSpec.value
    )});`;
}

export function generateIncStateDoBlock(
    spec: z.infer<typeof PartKindSpec>,
    _logicSpec: z.infer<typeof LogicSpec>,
    _logicIndex: number,
    doSpec: z.infer<typeof DoIncStateSpec>,
    _doIndex: number
): string {
    const stateVariableIndex = (spec.state || []).findIndex((stateSpec) => stateSpec.name === doSpec.name);
    return `incStateValue(ds, partId, ${stateVariableIndex}, ${doSpec.index}, ${doSpec.step ?? 1});`;
}

export function generateDeccStateDoBlock(
    spec: z.infer<typeof PartKindSpec>,
    _logicSpec: z.infer<typeof LogicSpec>,
    _logicIndex: number,
    doSpec: z.infer<typeof DoIncStateSpec>,
    _doIndex: number
): string {
    const stateVariableIndex = (spec.state || []).findIndex((stateSpec) => stateSpec.name === doSpec.name);
    return `decStateValue(ds, partId, ${stateVariableIndex}, ${doSpec.index}, ${doSpec.step ?? 1});`;
}

export function generateDoBlock(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    doSpec: z.infer<typeof DoSpec>,
    doIndex: number
): string {
    switch (doSpec.kind) {
        case 'setstate':
            return generateSetStateDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex);
        case 'incstate':
            return generateIncStateDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex);
        case 'decstate':
            return generateDeccStateDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex);
        default:
            throw new Error(`${doSpec.kind} not implemented yet`);
    }
    return ``;
}

export function generateActionTriggerArgs(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>
): string {
    if (logicSpec.when.kind != 'action') {
        throw new Error(`not an action trigger`);
    }
    const action = (spec.actions || []).find(
        (action) => logicSpec.when.kind === 'action' && action.name === logicSpec.when.name
    );
    if (!action) {
        throw new Error(`no action found with name ${logicSpec.when.name}`);
    }
    if (!action.args || action.args.length === 0) {
        return '';
    }
    const args = action.args || [];
    return `
        ( ${args
            .map((arg, idx) => `${genArgType(arg, true)} trigger_arg_${idx}`)
            .join(', ')} ) = abi.decode(payload, (${args.map((arg) => genArgType(arg)).join(', ')}));
    `;
}

export function generateTriggerArgs(spec: z.infer<typeof PartKindSpec>, logicSpec: z.infer<typeof LogicSpec>): string {
    switch (logicSpec.when.kind) {
        case 'action':
            return generateActionTriggerArgs(spec, logicSpec);
        default:
            throw new Error(`trigger kind ${logicSpec.when.kind} not implemented`);
    }
}

export function generateLogicFunc(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number
): string {
    return `
        function logicBlock${logicIndex}(Game ds, bytes24 sender, bytes24 partId, bytes memory payload) override internal {
            ${generateTriggerArgs(spec, logicSpec)}

            ${logicSpec.do
                .map((doSpec, doIndex) => generateDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex))
                .join('\n            ')}
        }
    `;
}

export function generateContract(spec: z.infer<typeof PartKindSpec>): string {
    return `
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/IState.sol";
import {Game} from "cog/IGame.sol";
import {PartKind} from "@ds/ext/PartKind.sol";

contract Generated is PartKind {
    ${(spec.logic || []).map((logicSpec, logicIndex) => generateLogicFunc(spec, logicSpec, logicIndex)).join('\n\n')}
}`;
}
