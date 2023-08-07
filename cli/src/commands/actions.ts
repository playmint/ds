import { DOWNSTREAM_GAME_ACTIONS } from '@downstream/core';

export const actions = {
    command: 'actions',
    describe: 'show available action signatures',
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

export const dispatch = {
    command: 'dispatch <action> <arguments>',
    aliases: ['despatch', 'exec'],
    describe: 'dispatch an action.',
    builder: (yargs) =>
        yargs
            .positional('action', { describe: 'name of action', type: 'string' })
            .positional('arguments', { describe: 'JSON array of arguments to action', type: 'string' })
            .example([
                [
                    `$0 action dispatch DEV_SPAWN_TILE '[1, 100, -100, 0]'`,
                    'dispatch the DEV_SPAWN_TILE action with args',
                ],
            ])
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
