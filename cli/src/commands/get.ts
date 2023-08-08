import { getCoords } from '@downstream/core';
import { pipe, take, toPromise } from 'wonka';

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

const formatNodeObject = (node) => {
    const name = node.name?.value || null;
    const owner = node.owner?.addr;
    if (node.kind == 'Item') {
        const { stackable, red, green, blue } = getItemDetails(node.id);
        const { id, kind } = node;
        return { kind, id, name, owner, goo: { red, green, blue }, stackable };
    } else if (node.kind == 'Building') {
        const buildingkind = node.buildingkind?.name?.value || '';
        const { kind, id } = node;
        const coords = node.location
            .map((l) => getCoords(l.tile))
            .map(({ q, r, s }) => [q, r, s])
            .find(() => true);
        return { kind, id, owner, buildingkind, coords };
    } else if (node.kind == 'MobileUnit') {
        const { kind, id } = node;
        const coords = node.location
            .map((l) => getCoords(l.tile))
            .map(({ q, r, s }) => [q, r, s])
            .find(() => true);
        return { kind, id, owner, name, coords };
    } else if (node.kind == 'BuildingKind') {
        const { kind, id } = node;
        return { kind, id, name, owner };
    } else if (node.kind == 'Player') {
        const { kind, id, key } = node;
        return { kind, id, addr: key, name };
    } else if (node.kind == 'Tile') {
        const { q, r, s } = getCoords({ coords: node.keys });
        const coords = [q, r, s];
        const { kind, id } = node;
        return { kind, id, coords };
    } else {
        throw new Error(`formatting for ${node.kind} not implemented yet sorry`);
    }
};

const getNodesByKind = async (ctx, kinds: string[]) => {
    const client = await ctx.client();
    const res: any = await pipe(client.query(GET_NODES_BY_KIND, { gameID: ctx.game, kinds }), take(1), toPromise);
    return res.game.state.nodes.map(formatNodeObject);
};

const kindNames = {
    Item: ['items', 'item'],
    Player: ['players', 'player'],
    BuildingKind: ['buildingkinds', 'buildingkind'],
    Building: ['buildings', 'building'],
    Tile: ['tiles', 'tile'],
    MobileUnit: ['mobileunit', 'mobileunits', 'unit', 'units'],
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

        let nodes = await getNodesByKind(ctx, kind);

        // filter by id or name
        if (ctx.id) {
            if (ctx.id.startsWith('0x')) {
                nodes = nodes.filter((n) => n.id === ctx.id);
            } else {
                const re = new RegExp(ctx.id, 'i');
                nodes = nodes.filter((n) => n.name && n.name.length > 0 && re.test(n.name));
            }
        }

        ctx.output.write(nodes);
    },
};

export default command;
