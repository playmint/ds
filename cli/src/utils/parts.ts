import fs from 'fs';
import { z } from 'zod';
import YAML from 'yaml';
import { Name } from './manifest';

export const BuildingCategoryEnumVals = ['none', 'blocker', 'extractor', 'factory', 'custom'] as const;
export const BuildingCategoryEnum = z.enum(BuildingCategoryEnumVals);
export type BuildingCategoryEnum = z.infer<typeof BuildingCategoryEnum>;

export const ContractSource = z.object({
    file: z.string().optional(),
    bytecode: z.string().optional(), // precopmiled bytecode hex string (not 0x prefixed)
    includes: z.string().array().optional(), // list of library search paths
});

export const ActionArgType = z.enum(['uint64', 'int64', 'bytes24', 'address']);

export const ActionArg = z.object({
    name: Name,
    type: ActionArgType,
    list: z.boolean().default(false).optional(),
    length: z.number().min(0).optional(),
});

export const ActionSpec = z.object({
    name: Name,
    args: ActionArg.array().optional(),
});

export const PartDefSpec = z.object({
    name: Name,
    kind: Name,
    list: z.boolean().default(false).optional(),
    length: z.number().min(0).optional(),
});

export const StateDefSpec = z.object({
    // maybe ActionArg and StateDef are the same thing?
    name: Name,
    type: ActionArgType,
    list: z.boolean().default(false).optional(),
    length: z.number().min(0).optional(),
});

export const TriggerActionSpec = z.object({
    kind: z.literal('action'),
    name: Name,
});

export const TriggerStateSpec = z.object({
    kind: z.literal('state'),
    part: z.string(),
    state: Name,
});

export const TriggerSpec = z.discriminatedUnion('kind', [TriggerActionSpec, TriggerStateSpec]);

export const ValueFromPart = z.object({
    kind: z.literal('part'),
    part: Name,
    name: Name,
    // parent: ValueFromPart.optional()
});

export const ValueFromState = z.object({
    kind: z.literal('state'),
    name: Name,
});

export const ValueFromLoop = z.object({
    kind: z.literal('loop'),
    thing: z.enum(['index', 'value']),
    loop: Name, // label of the loop you want to get stuff from... something something nested loops
});

export const ValueFromLiteral = z.object({
    kind: z.literal('literal'),
    type: ActionArgType, // probably wrong name but same types
    value: z.string(),
});

export const ValueFromSelf = z.object({
    kind: z.literal('self'),
    thing: z.enum(['id', 'location', 'name']),
});

export const ValueFromTrigger = z.object({
    kind: z.literal('trigger'),
    name: Name,
    index: z.number().min(0).optional(),
});

export const ValueFromSpec = z.discriminatedUnion('kind', [
    ValueFromLiteral,
    ValueFromPart,
    ValueFromState,
    ValueFromLoop,
    ValueFromSelf,
    ValueFromTrigger,
]);

export const EqualCondition = z.object({
    kind: z.literal('equal'),
    a: ValueFromSpec,
    b: ValueFromSpec,
});

export const GreaterThanCondition = z.object({
    kind: z.literal('gt'),
    a: ValueFromSpec,
    b: ValueFromSpec,
});

export const LessThanCondition = z.object({
    kind: z.literal('lt'),
    a: ValueFromSpec,
    b: ValueFromSpec,
});

export const Condition = z.discriminatedUnion('kind', [
    EqualCondition,
    GreaterThanCondition,
    LessThanCondition,
    // etc..
]);

export const DoIfSpec = z.object({
    kind: z.literal('if'),
    conditions: Condition.array(),
    then: z.lazy(() => DoSpec).array(),
    else: z.lazy(() => DoSpec).array(),
});

export const DoForEachSpec = z.object({
    kind: z.literal('foreach'),
    label: Name, // unique label for this loop/scope
    elements: ValueFromSpec,
    do: z.lazy(() => DoSpec).array(),
});

export const TargetPartSetSpec = z.object({
    kind: z.literal('set'),
    name: Name,
});

export const TargetPartInsertSpec = z.object({
    kind: z.literal('insert'),
    name: Name,
    index: z.number().min(0),
});

export const TargetPartAppendSpec = z.object({
    kind: z.literal('append'),
    name: Name,
});

export const TargetPartSpec = z.discriminatedUnion('kind', [
    TargetPartSetSpec,
    TargetPartInsertSpec,
    TargetPartAppendSpec,
]);

export const DoSpawnSpec = z.object({
    kind: z.literal('spawn'),
    partKind: Name, // name me
    location: ValueFromSpec,
    at: TargetPartSpec,
});

export const DoSetStateSpec = z.object({
    kind: z.literal('setstate'),
    name: Name,
    value: ValueFromSpec,
});

export const DoIncStateSpec = z.object({
    kind: z.literal('incstate'),
    name: Name,
    step: z.number().min(1).default(1).optional(),
});

export const DoDecStateSpec = z.object({
    kind: z.literal('decstate'),
    name: Name,
    step: z.number().min(1).default(1).optional(),
});

export const DoCallActionSpec = z.object({
    kind: z.literal('callaction'),
    name: Name, // action name
    part: Name, // part name
    args: ValueFromSpec.array().optional(),
});

export const Address = z.string().min(5).max(1000);

export const ContractAbiArg = z.object({
    type: z.enum(['address', 'uint256']),
    value: ValueFromSpec,
});

export const DoCallContractSpec = z.object({
    kind: z.literal('callcontract'),
    address: Address,
    function: z.string(), // function nameOfFunc( uint256, bytes24 )
    args: ContractAbiArg.array(),
});

export const DoSpec = z.discriminatedUnion('kind', [
    DoIfSpec,
    DoForEachSpec,
    DoSpawnSpec,
    DoSetStateSpec,
    DoCallActionSpec,
    DoCallContractSpec,
]);

export const LogicSpec = z.object({
    when: TriggerSpec,
    do: DoSpec.array(),
});

export const PartKindSpec = z.object({
    name: Name,
    model: z.enum(['button', 'chip', '...']),
    actions: ActionSpec.array(),
    parts: PartDefSpec.array(),
    state: StateDefSpec.array(),
    logic: LogicSpec,
});

export const PartKind = z.object({
    kind: z.literal('PartKind'),
    spec: PartKindSpec,
    status: z
        .object({
            id: z.string(),
            owner: z.string(),
        })
        .optional(),
});

// Part

// PartRefAssignment
