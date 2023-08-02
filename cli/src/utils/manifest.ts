import { z } from 'zod';

const ContractSource = z.object({
    file: z.string(),
    includes: z.string().array().optional(), // list of library search paths
});

const PluginSource = z.object({
    file: z.string(),
});

const Atom = z.number().gte(0).lt(4294967295);

const Slot = z.object({
    item: z.string(),
    quantity: z.number().gte(0).lt(100),
});

const ItemKind = z.object({
    kind: z.literal('item'),
    name: z.string().min(3).max(32),
    id: z.number().gte(0).lt(4294967295), // TODO: remove this and just use name?
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

const BuildingKind = z.object({
    kind: z.literal('building'),
    id: z.number().gte(0).lt(4294967295), // TODO: remove this and just use name?
    name: z.string(),
    contract: ContractSource,
    plugin: PluginSource,
    materials: Slot.array().nonempty().max(4),
    inputs: Slot.array().max(4),
    outputs: Slot.array().max(1),
});

const Kind = z.discriminatedUnion('kind', [ItemKind, BuildingKind]);

export const Manifest = z.object({
    metadata: z.object({
        name: z.string(),
    }),
    kinds: Kind.array(),
});
