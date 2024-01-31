import { z } from 'zod';
import {
    ActionArg,
    DoCallActionSpec,
    DoDecStateSpec,
    DoForEachSpec,
    DoIncStateSpec,
    DoSpec,
    LogicSpec,
    PartKindSpec,
    ValueFromLiteral,
    ValueFromLoop,
    ValueFromSpec,
    ValueFromState,
} from './manifest';
import { encodePartKindActionDefID, encodePartKindID, encodePartKindStateDefID } from './applier';

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
        case 'state':
            return getValueFromStateArgType(spec, logicSpec, logicIndex, valueSpec);
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
    logicIndex: number,
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
    return `trigger_arg_${triggerArgIndex}${
        triggerArg.list && !suppressAccessor
            ? `[${generateValueFrom(spec, logicSpec, logicIndex, valueSpec.index)}]`
            : ``
    }`;
}

export function generateValueFromLiteral(valueSpec: z.infer<typeof ValueFromLiteral>): string {
    return `${valueSpec.type}(${valueSpec.value})`;
}

export function generateValueFromPart(
    spec: z.infer<typeof PartKindSpec>,
    valueSpec: z.infer<typeof ValueFromSpec>
): string {
    if (valueSpec.kind != 'part') {
        throw new Error(`getValueFromPart called on a non action valueSpec`);
    }
    const partDef = (spec.parts || []).find((part) => part.name === valueSpec.part);
    if (!partDef) {
        throw new Error(`cannot get value from part ${valueSpec.part}: no part found`);
    }
    const partDefIndex = (spec.parts || []).indexOf(partDef);

    const connectedPartKindId = encodePartKindID(partDef.kind);
    const connectedPartStateDefId = encodePartKindStateDefID(connectedPartKindId, valueSpec.name);

    // FIXME: support more than just Int64
    // FIXME: support lists
    return `getValueFromPartInt64(
        ds,
        partId,
        ${partDefIndex},
        0,
        bytes24(${connectedPartStateDefId}),
        0
    )`;
}

export function generateValueFromState(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    valueSpec: z.infer<typeof ValueFromState>
): string {
    if (valueSpec.kind != 'state') {
        throw new Error(`generateValueFromState called on a non state valueSpec`);
    }

    if (!spec.state) throw new Error(`cannot generate ValueFromState: no state defined for part ${spec.name}`);

    const stateVariableDef = spec.state.find((stateSpec) => stateSpec.name === valueSpec.name);
    if (!stateVariableDef)
        throw new Error(`cannot generate ValueFromState: no state variable found with name: ${valueSpec.name}`);

    const stateVariableIndex = spec.state.indexOf(stateVariableDef);

    return `getState${
        stateVariableDef.type[0].toUpperCase() + stateVariableDef.type.substring(1)
    }(ds, partId, ${stateVariableIndex}, ${generateValueFrom(spec, logicSpec, logicIndex, valueSpec.index)})`;
}

export function getValueFromStateArgType(
    spec: z.infer<typeof PartKindSpec>,
    _logicSpec: z.infer<typeof LogicSpec>,
    _logicIndex: number,
    valueSpec: z.infer<typeof ValueFromState>
): string {
    if (valueSpec.kind != 'state') {
        throw new Error(`generateValueFromState called on a non state valueSpec`);
    }

    if (!spec.state) throw new Error(`cannot generate ValueFromState: no state defined for part ${spec.name}`);

    const stateVariableDef = spec.state.find((stateSpec) => stateSpec.name === valueSpec.name);
    if (!stateVariableDef)
        throw new Error(`cannot generate ValueFromState: no state variable found with name: ${valueSpec.name}`);

    return stateVariableDef.type;
}

export function generateValueFromLoop(
    _spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    _logicIndex: number,
    valueSpec: z.infer<typeof ValueFromLoop>
): string {
    return generateLoopIndexString(logicSpec.do, valueSpec.label) + (valueSpec.thing === 'value' ? '_value' : '');
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
        case 'part':
            return generateValueFromPart(spec, valueSpec);
        case 'state':
            return generateValueFromState(spec, logicSpec, logicIndex, valueSpec);
        default:
            throw new Error(`cannot get value from ${valueSpec.kind}: not implemented yet`);
    }
}

export function getStateSpec(spec: z.infer<typeof PartKindSpec>, name: string) {
    if (!spec.state) throw new Error(`cannot getStateSpec: no state defined for part ${spec.name}`);

    const stateDefSpec = spec.state.find((stateSpec) => stateSpec.name === name);
    if (!stateDefSpec) throw new Error(`cannot getStateSpec: no state variable found with name: ${name}`);

    const stateDefIndex = spec.state.indexOf(stateDefSpec);

    return {
        stateDefSpec,
        stateDefIndex,
    };
}

export function generateSetStateDoBlock(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    doSpec: z.infer<typeof DoSpec>,
    _doIndex: number
): string {
    const { stateDefSpec, stateDefIndex } = getStateSpec(spec, doSpec.name);

    return `setStateValue(ds, partId, ${stateDefIndex}, ${generateValueFrom(
        spec,
        logicSpec,
        logicIndex,
        doSpec.index
    )}, ${stateDefSpec.type}(${generateValueFrom(spec, logicSpec, logicIndex, doSpec.value)}));`;
}

export function generateCallActionDoBlock(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    doSpec: z.infer<typeof DoCallActionSpec>,
    _doIndex: number
): string {
    const partDef = (spec.parts || []).find(part => part.name === doSpec.part);
    if (!partDef) {
        throw new Error(`cannot callaction on part ${doSpec.part}: no part found`);
    }
    const partDefIndex = (spec.parts || []).indexOf(partDef);
    const connectedPartKindId = encodePartKindID(partDef.kind);
    const connectedPartActionDefId = encodePartKindActionDefID(connectedPartKindId, doSpec.name);

    const payloadValues = doSpec.args.map(valueSpec => generateValueFrom(spec, logicSpec, logicIndex, valueSpec));
    const payload = `abi.encode(${payloadValues.join(',')})`;

    return `callPartAction(
        ds,
        partId,
        ${partDefIndex},
        0,
        ${connectedPartActionDefId},
        ${payload}
    );`;
}

export function generateIncStateDoBlock(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    doSpec: z.infer<typeof DoIncStateSpec>,
    _doIndex: number
): string {
    const { stateDefSpec, stateDefIndex } = getStateSpec(spec, doSpec.name);

    return `incStateValue(ds, partId, ${stateDefIndex}, ${generateValueFrom(
        spec,
        logicSpec,
        logicIndex,
        doSpec.index
    )}, ${stateDefSpec.type}(${generateValueFrom(spec, logicSpec, logicIndex, doSpec.step)}));`;
}

export function generateDecStateDoBlock(
    spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>,
    logicIndex: number,
    doSpec: z.infer<typeof DoDecStateSpec>,
    _doIndex: number
): string {
    const { stateDefSpec, stateDefIndex } = getStateSpec(spec, doSpec.name);

    return `decStateValue(ds, partId, ${stateDefIndex}, ${generateValueFrom(
        spec,
        logicSpec,
        logicIndex,
        doSpec.index
    )}, ${stateDefSpec.type}(${generateValueFrom(spec, logicSpec, logicIndex, doSpec.step)}));`;
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
    const getListLengthStr = (valueFromSpec: z.infer<typeof ValueFromSpec>) => {
        switch (valueFromSpec.kind) {
            case 'trigger': {
                const varName = generateValueFrom(spec, logicSpec, logicIndex, valueFromSpec, true);
                return `${varName}.length`;
            }
            case 'state': {
                const { stateDefSpec } = getStateSpec(spec, valueFromSpec.name);
                if (!stateDefSpec.list) {
                    throw new Error(`Cannot iterate over non list state var: `, valueFromSpec.name);
                }
                return `${stateDefSpec.length}`;
            }
            default: {
                throw new Error(`Cannot iterate over state var: `, valueFromSpec.name);
            }
        }
    };

    const listType = getValueFromArgType(spec, logicSpec, logicIndex, doSpec.elements);
    const itr = generateLoopIndexString(logicSpec.do[doIndex], doSpec.label);
    const elementAccessor =
        doSpec.elements.kind == 'trigger'
            ? generateValueFrom(spec, logicSpec, logicIndex, doSpec.elements, true) + `[${itr}]`
            : generateValueFrom(spec, logicSpec, logicIndex, {
                  kind: doSpec.elements.kind,
                  name: doSpec.elements.name,
                  index: {
                      kind: 'literal',
                      type: 'uint64',
                      value: itr,
                  },
              });
    const valueName = `${itr}_value`;
    return `
            for (uint ${itr} = 0; ${itr} < ${getListLengthStr(doSpec.elements)}; ${itr}++) {
                ${listType} ${valueName} = ${elementAccessor};

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
            return generateDecStateDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex);
        case 'foreach':
            return generateForEachDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex, doDepth);
        case 'callaction':
            return generateCallActionDoBlock(spec, logicSpec, logicIndex, doSpec, doIndex);
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

export function generateStateTriggerArgs(
    _spec: z.infer<typeof PartKindSpec>,
    logicSpec: z.infer<typeof LogicSpec>
): string {
    if (logicSpec.when.kind != 'state') {
        throw new Error(`generateStateTriggerArgs expected a state trigger, got ${logicSpec.when.kind}`);
    }
    return ``;
}

export function generateTriggerArgs(spec: z.infer<typeof PartKindSpec>, logicSpec: z.infer<typeof LogicSpec>): string {
    switch (logicSpec.when.kind) {
        case 'action':
            return generateActionTriggerArgs(spec, logicSpec);
        case 'state':
            return generateStateTriggerArgs(spec, logicSpec);
        default:
            throw new Error(`generateStateTriggerArgs: unexpected kind`);
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
