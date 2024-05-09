import {
    GetGlobalDocument,
    GetZoneDocument,
    CompoundKeyEncoder,
    NodeSelectors,
    getCoords,
    ZoneStateFragment,
} from '@downstream/core';
import { pipe, take, toPromise } from 'wonka';
import { z } from 'zod';
import { BiomeTypes, FacingDirectionTypes, Manifest, Slot } from '../utils/manifest';
import { GlobalStateFragment } from '@downstream/core';

const SLOT_FRAGMENT = `
    key
    balance: weight
    item: node {
        id
        name: annotation(name: "name") {
            id
            value
        }
        icon: annotation(name: "icon") {
            id
            value
        }
    }
`;

const NODE_FRAGMENT = `
                id
                kind
                key
                keys
                name: annotation(name: "name") { value }
                owner: node(match: { kinds: "Player", via: { rel: "Owner" } }) {
                    id
                    kind
                    addr: key
                }

                model: annotation(name: "model") {
                    id
                    value
                }
                icon: annotation(name: "icon") {
                    id
                    value
                }
                # materials are the construction costs to build
                materials: edges(match: { kinds: ["Item"], via: { rel: "Material" } }) {
                    ${SLOT_FRAGMENT}
                }

                # inputs (if set) are the registered crafting inputs
                inputs: edges(match: { kinds: ["Item"], via: { rel: "Input" } }) {
                    ${SLOT_FRAGMENT}
                }

                # outputs (if set) are the registered crafting outputs
                outputs: edges(match: { kinds: ["Item"], via: { rel: "Output" } }) {
                    ${SLOT_FRAGMENT}
                }
                buildingkind: node(match: { kinds: "BuildingKind", via: { rel: "Is" } }) {
                    id
                    name: annotation(name: "name") { value }
                }
                location: edges(match: { kinds: "Tile", via: { rel: "Location" } }) {
                    key
                    tile: node {
                        id
                        coords: keys
                    }
                }
                implementation: node(match: { via: { rel: "Is" } }) {
                    id
                }
`;
const GET_NODES_BY_KIND = `query GetNodes($gameID: ID!, $kinds: [String!]!) {
    game(id: $gameID) {
        state(simulated: true) {
            nodes(match: { kinds: $kinds }) {
                ${NODE_FRAGMENT}
            }
        }
    }
}`;

const getItemDetails = (itemId) => {
    const [stackable, green, blue, red] = [...itemId]
        .slice(2)
        .reduce((bs, b, idx) => {
            if (idx % 8 === 0) {
                bs.push('0x');
            }
            bs[bs.length - 1] += b;
            return bs;
        }, [] as string[])
        .map((n: string) => Number(BigInt(n)))
        .slice(-4);
    return { stackable: stackable === 1, green, blue, red };
};

const nodeToManifest = (node): z.infer<typeof Manifest> => {
    const name = node.name?.value || '';
    const owner = node.owner?.addr;
    if (node.kind == 'Item') {
        const { stackable, red, green, blue } = getItemDetails(node.id);
        const { kind, icon, id } = node;
        const status = { id, owner };
        const spec = { name, icon: icon?.value || '', goo: { red, green, blue }, stackable };
        return { kind, spec, status };
    } else if (node.kind == 'Building') {
        const buildingKindName = node.buildingkind?.name?.value || '';
        const { kind, id } = node;
        const location = node.location
            .map((l) => getCoords(l.tile))
            .map(({ z, q, r, s }) => [z, q, r, s])
            .find(() => true);
        const spec = {
            name: buildingKindName,
            location,
            facingDirection: node.facingDirection?.value || FacingDirectionTypes[1],
        };
        const status = { owner, id };
        return { kind, spec, status };
    } else if (node.kind == 'MobileUnit') {
        const { kind, id } = node;
        const location = node.location
            .map((l) => getCoords(l.tile))
            .map(({ z, q, r, s }) => [z, q, r, s])
            .find(() => true);
        const spec = { name };
        const status = { id, owner, location };
        return { kind, spec, status };
    } else if (node.kind == 'BuildingKind') {
        const { kind, id, materials, inputs, outputs, implementation } = node;
        const getSlotConfig = (slot): z.infer<typeof Slot> => {
            return { name: slot.item?.name?.value, quantity: slot.balance };
        };
        const model = node.model?.value || '';
        // TODO: fixup once category and extractor is a real thing, this is currently a guess
        const category = outputs.length > 0 ? 'factory' : implementation ? 'custom' : 'blocker';
        const spec = (() => {
            if (category === 'factory') {
                return {
                    name,
                    category,
                    model,
                    materials: materials.map(getSlotConfig),
                    inputs: inputs.map(getSlotConfig),
                    outputs: outputs.map(getSlotConfig),
                };
            } else if (category === 'custom') {
                return {
                    name,
                    category,
                    model,
                    materials: materials.map(getSlotConfig),
                };
            } else if (category === 'blocker') {
                return {
                    name,
                    category,
                    model,
                    materials: materials.map(getSlotConfig),
                };
            } else {
                throw new Error(`unsupported category ${category}`);
            }
        })();

        const status = { id, owner };
        return { kind, spec, status };
    } else if (node.kind == 'Player') {
        const { kind, id, key } = node;
        const spec = { address: key, name };
        const status = { id };
        return { kind, spec, status };
    } else if (node.kind == 'Tile') {
        const { q, r, s } = getCoords({ coords: node.keys });
        const { kind, id } = node;
        const spec = { location: [q, r, s] as [number, number, number], biome: BiomeTypes[1] };
        const status = { id };
        return { kind, spec, status };
    } else {
        throw new Error(`formatting for ${node.kind} not implemented yet sorry`);
    }
};

export const getManifestsByKind = async (ctx, kinds: string[]): Promise<z.infer<typeof Manifest>[]> => {
    const client = await ctx.client();
    const res: any = await pipe(client.query(GET_NODES_BY_KIND, { gameID: ctx.game, kinds }), take(1), toPromise);
    return res.game.state.nodes.map(nodeToManifest);
};

export const getZone = async (ctx): Promise<ZoneStateFragment> => {
    const client = await ctx.client();
    const res: any = await pipe(
        client.query(GetZoneDocument, {
            gameID: ctx.game,
            zoneID: CompoundKeyEncoder.encodeUint160(NodeSelectors.Zone, ctx.zone),
        }),
        take(1),
        toPromise
    );
    const zone = res?.game?.state?.zone;
    if (!zone?.key) {
        throw new Error(`zone not found`);
    }
    return zone;
};

export const getGlobal = async (ctx): Promise<GlobalStateFragment> => {
    const client = await ctx.client();
    const res: any = await pipe(client.query(GetGlobalDocument, { gameID: ctx.game }), take(1), toPromise);
    return res.game.state;
};

const kindNames = {
    Item: ['items', 'item'],
    Player: ['players', 'player'],
    BuildingKind: ['buildingkinds', 'buildingkind'],
    Building: ['buildings', 'building'],
    Tile: ['tiles', 'tile'],
    MobileUnit: ['units', 'unit', 'mobileunit', 'mobileunits'],
};

const normalizeKind = (givenKindName) => {
    return Object.keys(kindNames).find((kindName) => kindNames[kindName].includes(givenKindName.toLowerCase()));
};

const command = {
    command: 'get <kind> [id]',
    describe: `Display details about one or many game entities.`,
    builder: (cli) => {
        cli.positional('kind', {
            describe: 'entity kind',
            type: 'string',
            choices: Object.values(kindNames).flatMap((v) => v),
        });
        cli.positional('id', {
            describe: 'filter by a specific id',
            type: 'string',
        });
        cli.demand(['kind']);
        cli.example([
            ['$0 get items', 'Fetch all registered Items'],
            ['$0 get item goo', 'Search for Items with "goo" in their name'],
            ['$0 get item 0x4324...', 'Fetch a single entity by id'],
            ['$0 get players', 'Fetch all registered players'],
            ['$0 get buildingkinds', 'Fetch all registered building kinds'],
        ]);
    },
    handler: async (ctx) => {
        const kind = ctx.kind
            .split(',')
            .map((k) => k.trim())
            .map(normalizeKind)
            .find((k) => !!k);
        if (!kind) {
            throw new Error(`must specify at least one kind or id`);
        }

        let manifests = await getManifestsByKind(ctx, kind);

        // filter by id or name
        if (ctx.id) {
            if (ctx.id.startsWith('0x')) {
                manifests = manifests.filter(
                    ({ status, kind }) => status && kind !== 'Quest' && (status as any).id === ctx.id
                );
            } else {
                const re = new RegExp(ctx.id, 'i');
                manifests = manifests.filter((manifest: any) => manifest.spec?.name && re.test(manifest.spec?.name));
            }
        }

        manifests = manifests.sort(bySpecName);

        ctx.output.write(manifests);
    },
};

function bySpecName(a: z.infer<typeof Manifest>, b: z.infer<typeof Manifest>): number {
    const nameA = (a.spec as any).name || '';
    const nameB = (b.spec as any).name || '';
    if (!nameA && !nameB) {
        return 0;
    }
    return (nameA || '') > (nameB || '') ? 1 : -1;
}

export default command;
