import { NodeSelectors } from '@downstream/core';
import { solidityPacked } from 'ethers';
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

const register = {
    command: 'register <id>',
    describe: 'register a custom item kind',
    builder: (yargs) =>
        yargs
            .positional('id', {
                describe: 'your extension id',
                type: 'number',
            })
            .option('name', {
                describe: 'name of building kind',
                type: 'string',
            })
            .option('red', {
                describe: 'amount of red goo in item',
                type: 'number',
            })
            .option('green', {
                describe: 'amount of green goo in item',
                type: 'number',
            })
            .option('blue', {
                describe: 'amount of blue goo in item',
                type: 'number',
            })
            .option('icon', {
                describe: 'an icon name to show in clients',
                type: 'string',
            })
            .option('stackable', {
                describe: 'is the item stackable',
                type: 'boolean',
            })
            .demand(['id', 'name', 'red', 'green', 'blue'])
            .check((argv) => {
                if (typeof argv.id !== 'undefined' && argv.id < 1) {
                    throw new Error(`id must be greater than 1`);
                }
                return true;
            }),
    handler: async (ctx) => {
        const player = await ctx.player();

        // build item id
        // uint32[3] memory outputItemAtoms = [uint32(cfg.greenGoo), uint32(cfg.blueGoo), uint32(cfg.redGoo)];
        // bytes24 itemKind = Node.Item(uint32(cfg.id), outputItemAtoms, cfg.stackable);
        const itemID = solidityPacked(
            ['bytes4', 'uint32', 'uint32', 'uint32', 'uint32', 'uint32'],
            [NodeSelectors.Item, ctx.id, ctx.stackable ? 1 : 0, ctx.green, ctx.blue, ctx.red]
        );
        console.log('item', itemID);

        await player.dispatch({
            name: 'REGISTER_ITEM_KIND',
            args: [itemID, ctx.name, ctx.icon],
        });

        ctx.output.write('ok');
        process.exit(0);
    },
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
    builder: (cli) => {
        cli.positional('pattern', { describe: 'substring to match name', type: 'string' });
        cli.demand(['pattern']);
    },
    handler: async (ctx) => {
        const re = new RegExp(ctx.pattern, 'i');
        const items = (await getItems(ctx)).filter((item) => re.test(item.name || ''));
        ctx.output.write(items);
    },
};

const show = {
    command: 'show <id>',
    describe: 'item details',
    builder: (cli) => {
        cli.positional('id', { describe: 'id of item', type: 'string' });
        cli.demand(['id']);
    },
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
    builder: (cli) => {
        cli.command(list);
        cli.command(show);
        cli.command(search);
        cli.command(register);
        cli.demandCommand();
    },
};

export default item;
