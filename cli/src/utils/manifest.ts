import { z } from 'zod';

export const ContractSource = z.object({
    file: z.string(),
    includes: z.string().array().optional(), // list of library search paths
});

export const PluginSource = z.object({
    file: z.string(),
});

export const Atom = z.number().gte(0).lt(4294967295);

export const Slot = z.object({
    item: z.string(),
    quantity: z.number().gte(0).lt(100),
});

export const ItemSpec = z.object({
    kind: z.literal('item'),
    name: z.string().min(3).max(32),
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

export const BuildingSpec = z.object({
    kind: z.literal('building'),
    name: z.string(),
    contract: ContractSource.optional(),
    plugin: PluginSource.optional(),
    materials: Slot.array().nonempty().max(4),
    inputs: Slot.array().max(4),
    outputs: Slot.array().max(1),
});

export const Spec = z.discriminatedUnion('kind', [ItemSpec, BuildingSpec]);

export const Manifest = z.object({
    filename: z.string(),
    spec: Spec,
});
