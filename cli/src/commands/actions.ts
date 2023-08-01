import { DOWNSTREAM_GAME_ACTIONS } from '@downstream/core';

const list = {
    command: 'list',
    aliases: ['ls'],
    describe: 'list actions',
    handler: async (ctx) => {
        const actions: any = [];
        DOWNSTREAM_GAME_ACTIONS.forEachFunction((fragment) => {
            actions.push({
                name: fragment.name,
                args:
                    ctx.format === 'table'
                        ? fragment.inputs.map(({ name, type }) => `${type} ${name}`).join(', ')
                        : fragment.inputs.map(({ name, type }) => ({ name, type })),
            });
        });
        ctx.output.write(actions);
    },
};

const dispatch = {
    command: 'dispatch <action> <arguments>',
    aliases: ['despatch', 'exec'],
    describe: 'dispatch an action',
    builder: (yargs) =>
        yargs
            .positional('action', { describe: 'name of action', type: 'string' })
            .positional('arguments', { describe: 'JSON array of arguments to action', type: 'string' })
            .demand(['arguments', 'action']),
    handler: async (ctx) => {
        const player = await ctx.player();
        const res = await player.dispatch({
            name: ctx.action,
            args: JSON.parse(ctx.arguments),
        });
        ctx.output.write(res);
        process.exit(0);
    },
};

export const action = {
    command: 'actions',
    aliases: ['action'],
    describe: 'list/dispatch actions',
    builder: (yargs) => yargs.command(list).command(dispatch).demandCommand(),
};

export default action;
