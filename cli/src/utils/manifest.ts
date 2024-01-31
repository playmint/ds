import fs from 'fs';
import { literal, z } from 'zod';
import YAML from 'yaml';

export const BuildingCategoryEnumVals = ['none', 'blocker', 'extractor', 'factory', 'custom', 'display'] as const;
export const BuildingCategoryEnum = z.enum(BuildingCategoryEnumVals);
export type BuildingCategoryEnum = z.infer<typeof BuildingCategoryEnum>;

export const ContractSource = z.object({
    source: z.string().optional(),
    file: z.string().optional(),
    bytecode: z.string().optional(), // precopmiled bytecode hex string (not 0x prefixed)
    includes: z.string().array().optional(), // list of library search paths
});

export const PluginSource = z.object({
    file: z.string().optional(),
    inline: z.string().optional(),
    alwaysActive: z.boolean().optional(),
});

export const Name = z.string().min(3).max(32);

export const OneLiner = z.string().min(3).max(180);

export const Atom = z.number().gte(0).lt(4294967295);

export const Slot = z
    .object({
        name: z.string(),
        quantity: z.number().gte(0).lte(100),
    })
    .superRefine(({ name, quantity }, ctx) => {
        if (quantity && quantity > 0 && !name) {
            ctx.addIssue({
                code: 'custom',
                message: 'Name required for item',
            });
        }
    });

export const Coords = z.tuple([z.number(), z.number(), z.number()]);

export const ItemSpec = z.object({
    name: Name,
    contract: ContractSource.optional(),
    plugin: PluginSource.optional(),
    goo: z.object({
        red: Atom,
        green: Atom,
        blue: Atom,
    }),
    stackable: z.boolean().default(true),
    icon: z
        .string()
        .min(3)
        .max(16)
        .regex(/^([^\/\s]+)/),
});

export const Item = z.object({
    kind: z.literal('Item'),
    spec: ItemSpec,
    status: z
        .object({
            id: z.string(),
            owner: z.string(),
        })
        .optional(),
});

const TotemModel = z.string().regex(/^[0-9]{2}(-[0-9]{2})?$/);
const DecorativeModel = z.enum([
    'enemy',
    'OakTreesLarge',
    'OakTreesSmall',
    'PineTreesLarge',
    'PineTreesSmall',
    'rocksLarge',
    'rocksSmall',
]);
const ExtractorModel = z.enum(['red', 'green', 'blue']);
const DisplayModel = z.enum(['default', 'countdown']);

export const BuildingKindFactorySpec = z.object({
    category: z.literal('factory'),
    name: Name,
    description: OneLiner.optional(),
    model: TotemModel,
    color: z.number().min(0).max(5).optional(),
    contract: ContractSource.optional(),
    plugin: PluginSource.optional(),
    materials: Slot.array().nonempty().max(4),
    inputs: Slot.array().max(4).optional(),
    outputs: Slot.array().max(1).optional(),
});

export const BuildingKindDisplaySpec = z.object({
    category: z.literal('display'),
    name: Name,
    description: OneLiner.optional(),
    model: DisplayModel,
    color: z.number().min(0).max(5).optional(),
    contract: ContractSource.optional(),
    plugin: PluginSource.optional(),
    materials: Slot.array().nonempty().max(4),
});

export const BuildingKindBlockerSpec = z.object({
    category: z.literal('blocker'),
    name: Name,
    description: OneLiner.optional(),
    model: DecorativeModel,
    materials: Slot.array().nonempty().max(4),
});

export const BuildingKindExtractorSpec = z.object({
    category: z.literal('extractor'),
    name: Name,
    description: OneLiner.optional(),
    model: ExtractorModel,
    contract: ContractSource.optional(),
    plugin: PluginSource.optional(),
    materials: Slot.array().nonempty().max(4),
    outputs: Slot.array().max(1).optional(),
});

export const BuildingKindCustomSpec = z.object({
    category: z.literal('custom'),
    name: Name,
    description: OneLiner.optional(),
    model: TotemModel,
    color: z.number().min(0).max(5).optional(),
    contract: ContractSource.optional(),
    plugin: PluginSource.optional(),
    materials: Slot.array().nonempty().max(4),
});

export const BuildingKindSpec = z.discriminatedUnion('category', [
    BuildingKindFactorySpec,
    BuildingKindBlockerSpec,
    BuildingKindExtractorSpec,
    BuildingKindCustomSpec,
    BuildingKindDisplaySpec,
]);

export const BuildingKind = z.object({
    kind: z.literal('BuildingKind'),
    spec: BuildingKindSpec,
    status: z
        .object({
            id: z.string(),
            owner: z.string(),
        })
        .optional(),
});

export const BuildingSpec = z.object({
    name: Name,
    location: Coords,
});

export const Building = z.object({
    kind: z.literal('Building'),
    spec: BuildingSpec,
    status: z
        .object({
            owner: z.string(),
            id: z.string(),
        })
        .optional(),
});

export const BiomeTypes = ['UNDISCOVERED', 'DISCOVERED'] as const;

export const TileSpec = z.object({
    location: Coords,
    biome: z.enum(BiomeTypes),
});

export const Tile = z.object({
    kind: z.literal('Tile'),
    spec: TileSpec,
    status: z
        .object({
            id: z.string(),
        })
        .optional(),
});

export const BagSpec = z.object({
    location: Coords,
    items: Slot.array().max(4).optional(),
});

export const Bag = z.object({
    kind: z.literal('Bag'),
    spec: BagSpec,
    status: z.object({}).optional(),
});

export const MobileUnitSpec = z.object({
    name: Name,
});

export const MobileUnit = z.object({
    kind: z.literal('MobileUnit'),
    spec: MobileUnitSpec,
    status: z
        .object({
            id: z.string().optional(),
            owner: z.string().optional(),
            location: Coords.optional(),
        })
        .optional(),
});

export const PlayerSpec = z.object({
    name: Name,
    address: z.string(),
});

export const Player = z.object({
    kind: z.literal('Player'),
    spec: PlayerSpec,
    status: z
        .object({
            id: z.string().optional(),
        })
        .optional(),
});

// Quest

export const TaskCoord = z.object({
    kind: z.literal('coord'),
    name: z.string(),
    location: Coords,
});

export const TaskMessage = z.object({
    kind: z.literal('message'),
    name: z.string(),
    message: z.string(),
    buildingKind: z.string(),
});

export const TaskInventory = z.object({
    kind: z.literal('inventory'),
    name: z.string(),
    item: Slot,
});

export const TaskCombat = z.object({
    kind: z.literal('combat'),
    name: z.string(),
    combatState: z.enum(['winAttack', 'winDefence']),
    // optional location of tile to be attacked?
});

export const TaskQuestAccept = z.object({
    kind: z.literal('questAccept'),
    name: z.string(),
    quest: Name,
});

export const TaskQuestComplete = z.object({
    kind: z.literal('questComplete'),
    name: z.string(),
    quest: Name,
});

export const TaskConstruct = z.object({
    kind: z.literal('construct'),
    name: z.string(),
    buildingKind: z.string().optional(),
});

export const TaskDeployBuilding = z.object({
    kind: z.literal('deployBuilding'),
    name: z.string(),
    craftInput: z.string().optional(),
    craftOutput: z.string().optional(),
});

export const TaskUnitStats = z.object({
    kind: z.literal('unitStats'),
    name: z.string(),
    life: z.number(),
    defence: z.number(),
    attack: z.number(),
});

export const Task = z.discriminatedUnion('kind', [
    TaskCoord,
    TaskMessage,
    TaskInventory,
    TaskCombat,
    TaskQuestAccept,
    TaskQuestComplete,
    TaskConstruct,
    TaskDeployBuilding,
    TaskUnitStats,
]);

export const QuestSpec = z.object({
    name: Name,
    description: OneLiner.nonempty(),
    location: Coords.optional(),
    tasks: Task.array().min(1),
    next: Name.array().max(5).optional(),
});

export const Quest = z.object({
    kind: z.literal('Quest'),
    spec: QuestSpec,
    status: z.object({}).optional(),
});

// -- Part kind

export const ActionArgTypeEnumVal = ['uint64', 'int64', 'bytes24', 'address'] as const;
export const ActionArgType = z.enum(ActionArgTypeEnumVal);
export type ActionArgType = z.infer<typeof ActionArgType>;

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
    label: Name, // label of the loop you want to get stuff from... something something nested loops
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
    index: z
        .lazy(() => ValueFromSpec)
        .default({
            kind: 'literal',
            type: 'uint64',
            value: '0',
        }),
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
    index: ValueFromSpec,
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
    index: ValueFromSpec.default({
        kind: 'literal',
        type: 'uint64',
        value: '0',
    }),
    value: ValueFromSpec,
});

export const DoIncStateSpec = z.object({
    kind: z.literal('incstate'),
    name: Name,
    index: ValueFromSpec.default({
        kind: 'literal',
        type: 'uint64',
        value: '0',
    }),
    step: ValueFromSpec.default({
        kind: 'literal',
        type: 'int64',
        value: '1',
    }),
});

export const DoDecStateSpec = z.object({
    kind: z.literal('decstate'),
    name: Name,
    index: ValueFromSpec.default({
        kind: 'literal',
        type: 'uint64',
        value: '0',
    }),
    step: ValueFromSpec.default({
        kind: 'literal',
        type: 'int64',
        value: '1',
    }),
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
    DoIncStateSpec,
    DoDecStateSpec,
    DoCallActionSpec,
    DoCallContractSpec,
]);

export const LogicSpec = z.object({
    when: TriggerSpec,
    do: DoSpec.array(),
});

export const PartKindSpec = z.object({
    name: Name,
    model: z.string(),
    actions: ActionSpec.array().optional(),
    parts: PartDefSpec.array().optional(),
    state: StateDefSpec.array().optional(),
    logic: LogicSpec.array().optional(),
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

export const PartSpec = z.object({
    name: Name, // kind
    location: Coords,
});

export const Part = z.object({
    kind: z.literal('Part'),
    spec: PartSpec,
    status: z
        .object({
            owner: z.string(),
            id: z.string(),
        })
        .optional(),
});

// -- //

export const Manifest = z.discriminatedUnion('kind', [
    BuildingKind,
    Item,
    Building,
    Tile,
    MobileUnit,
    Player,
    Quest,
    Bag,
    PartKind,
    Part,
]);

export const ManifestDocument = z.object({
    filename: z.string(),
    manifest: Manifest,
});

const readStdin = async () => {
    const chunks: any[] = [];
    for await (const chunk of process.stdin) chunks.push(chunk);
    return Buffer.concat(chunks).toString('utf8');
};

export const parseManifestDocuments = (filedata: string, filename?: string): z.infer<typeof ManifestDocument>[] => {
    return YAML.parseAllDocuments(filedata)
        .map((content) => content.toJSON())
        .map((content: any) => {
            const result = Manifest.safeParse(content);
            if (!result.success) {
                throw new Error(
                    result.error.issues
                        .map(
                            (iss) =>
                                `invalid manifest ${filename}: ${content.kind || ''} ${iss.path.join(
                                    '.'
                                )} field invalid: ${iss.message}`
                        )
                        .join('\n\n')
                );
            }
            return ManifestDocument.safeParse({ manifest: result.data, filename });
        })
        .map((result) => {
            if (!result.success) {
                throw new Error(
                    result.error.issues.map((iss) => `${filename} ${iss.path.join('.')} ${iss.message}`).join('\n\n')
                );
            }
            return result.data;
        });
};

export const readManifestsDocumentsSync = async (filename: string): Promise<z.infer<typeof ManifestDocument>[]> => {
    const filedata = filename === '-' ? await readStdin() : fs.readFileSync(filename).toString();
    return parseManifestDocuments(filedata, filename);
};
