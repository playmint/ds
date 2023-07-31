import { pipe, take, toPromise } from 'wonka';

const GET_ITEMS = `query GetItems($gameID: ID!) {
    game(id: $gameID) {
        state(simulated: true) {
            items: nodes(match: { kinds: "Item" }) {
                id
                name: annotation(name: "name") { value }
                owner: node(match: { kinds: "Player", via: { rel: "Owner" } }) { id }
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
    return { stackable, green, blue, red };
};

const getItems = async (ctx) => {
    const client = await ctx.client();
    const res: any = await pipe(client.query(GET_ITEMS, { gameID: ctx.game }), take(1), toPromise);
    return res.game.state.items.map(({ id, name, owner }) => {
        const details = getItemDetails(id);
        return { id, name: name?.value, owner: owner?.id, ...details };
    });
};

const list = {
    command: 'list',
    aliases: ['ls'],
    describe: 'list items',
    handler: async (ctx) => {
        const items = await getItems(ctx);
        ctx.output.write(items);
    },
};

const search = {
    command: 'search <pattern>',
    describe: 'find items matching pattern',
    builder: (yargs) =>
        yargs.positional('pattern', { describe: 'substring to match name', type: 'string' }).demand(['pattern']),
    handler: async (ctx) => {
        const re = new RegExp(ctx.pattern, 'i');
        const items = (await getItems(ctx)).filter((item) => re.test(item.name || ''));
        ctx.output.write(items);
    },
};

const show = {
    command: 'show <id>',
    describe: 'item details',
    builder: (yargs) => yargs.positional('id', { describe: 'id of item', type: 'string' }).demand(['id']),
    handler: async (ctx) => {
        const items = await getItems(ctx);
        const item = items.find((item) => item.id == ctx.id);
        ctx.output.write(item);
    },
};

export const item = {
    command: 'items',
    aliases: ['item'],
    describe: 'list/show available items',
    builder: (yargs) => yargs.command(list).command(show).command(search).demandCommand(),
};

export default item;
