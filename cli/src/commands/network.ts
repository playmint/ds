import { networks } from '../utils/networks';

const list = {
    command: 'list',
    aliases: ['ls'],
    describe: 'list network configurations',
    handler: (ctx) => {
        ctx.output.write(networks);
    },
};

const show = {
    command: 'show [name]',
    aliases: [],
    describe: 'show network details',
    builder: (yargs) =>
        yargs.check((ctx) => {
            if (ctx.name && ctx.network) {
                throw new Error('ambiguous network selected: specify either --network or [name] not both');
            }
            return true;
        }),
    handler: (ctx) => {
        const name = ctx.name ? ctx.name : ctx.network;
        const network = networks.find((n) => n.name == name);
        ctx.output.write(network);
    },
};

export const network = {
    command: 'networks',
    aliases: ['network', 'n', 'net'],
    describe: 'list/get network configuration',
    builder: (yargs) => yargs.command(list).command(show).demandCommand(),
    handler: (_argv) => {
        console.log(JSON.stringify(networks, null, 4));
    },
};

export default network;
