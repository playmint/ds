import { z } from 'zod';
import {
    ActionArg,
    DoDecStateSpec,
    DoForEachSpec,
    DoIncStateSpec,
    DoSpec,
    LogicSpec,
    PartKindSpec,
    ValueFromLiteral,
    ValueFromLoop,
    ValueFromSpec,
} from './manifest';

// TODO: Should args always be an array?
export function genArgType(arg: z.infer<typeof ActionArg>, includeStorageType: boolean = false): string {
    return `${arg.type}${arg.list ? `[${arg.length}] ${includeStorageType ? `memory` : ``}` : ``}`;
}

export function getValueFromArgType(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    valueSpec: z.infer<typeof ValueFromSpec>
): string {
    switch (valueSpec.kind) {
        case 'trigger':
            return getValueFromTriggerArgType(spec, logicSpec, logicIndex, valueSpec);
        case 'literal':
            return valueSpec.type;
        default:
            throw new Error(`cannot get arg type from valueSpec ${valueSpec.kind}: not implemented yet`);
    }
}

export function getValueFromTriggerArgType(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    _logicIndex: number,
    valueSpec: z.infer<typeof ValueFromSpec>
): string {
    if (logicSpec.when.kind != 'action') {
        throw new Error(`not an action trigger`);
    }
    if (valueSpec.kind != 'trigger') {
        throw new Error(`getValueFromTriggerArgType called on a non trigger valueSpec`);
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
    return triggerArg.type;
}

export function generateValueFromActionTrigger(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    _logicIndex: number,
    valueSpec: z.infer<typeof ValueFromSpec>,
    suppressAccessor: boolean = false
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
    return `trigger_arg_${triggerArgIndex}${triggerArg.list && !suppressAccessor ? `[${valueSpec.index}]` : ``}`;
}

export function generateValueFromLiteral(valueSpec: z.infer<typeof ValueFromLiteral>): string {
    return `${valueSpec.type}(${valueSpec.value})`;
}

export function generateValueFromLoop(
    _spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    _logicIndex: number,
    valueSpec: z.infer<typeof ValueFromLoop>
): string {
    return generateLoopIndexString(logicSpec.do, valueSpec.loop) + (valueSpec.thing === 'value' ? '_value' : '');
}

export function generateValueFrom(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    valueSpec: z.infer<typeof ValueFromSpec>,
    suppressAccessor: boolean = false
): string {
    switch (valueSpec.kind) {
        case 'trigger':
            return generateValueFromActionTrigger(spec, logicSpec, logicIndex, valueSpec, suppressAccessor);
        case 'loop':
            return generateValueFromLoop(spec, logicSpec, logicIndex, valueSpec);
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
    doSpec: z.infer<typeof DoDecStateSpec>,
    _doIndex: number
): string {
    const stateVariableIndex = (spec.state || []).findIndex((stateSpec) => stateSpec.name === doSpec.name);
    return `decStateValue(ds, partId, ${stateVariableIndex}, ${doSpec.index}, ${doSpec.step ?? 1});`;
}

export function generateLoopIndexString(
    _doSpec: z.infer<typeof DoSpec>,
    loopLabel: string,
    _loopIndex: number = 0,
    _indexStr: string = 'loop'
): string {
    return loopLabel;
}

export function generateForEachDoBlock(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    doSpec: z.infer<typeof DoForEachSpec>,
    doIndex: number,
    doDepth: number
): string {
    const varName = generateValueFrom(spec, logicSpec, logicIndex, doSpec.elements, true);
    const itr = generateLoopIndexString(logicSpec.do[doIndex], doSpec.label);
    const valueName = `${itr}_value`;
    return `
            for (uint ${itr} = 0; ${itr} < ${varName}.length; ${itr}++) {
                ${getValueFromArgType(spec, logicSpec, logicIndex, doSpec.elements)} ${valueName} = ${varName}[${itr}];
                ${doSpec.do
                    .map((doSpec, doIndex) =>
                        generateDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex, doDepth + 1)
                    )
                    .join('\n            ' + '    '.repeat(doDepth))}
            }
    `;
}

export function generateDoBlock(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    doSpec: z.infer<typeof DoSpec>,
    doIndex: number,
    doDepth: number
): string {
    switch (doSpec.kind) {
        case 'setstate':
            return generateSetStateDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex);
        case 'incstate':
            return generateIncStateDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex);
        case 'decstate':
            return generateDeccStateDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex);
        case 'foreach':
            return generateForEachDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex, doDepth);
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
    logicIndex: number,
    doDepth: number = 0
): string {
    return `
        function logicBlock${logicIndex}(Game ds, bytes24 sender, bytes24 partId, bytes memory payload) override internal {
            ${generateTriggerArgs(spec, logicSpec)}

            ${logicSpec.do
                .map((doSpec, doIndex) => generateDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex, doDepth))
                .join('\n            ' + '    '.repeat(doDepth))}
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
