import path from 'path';
import { compile } from '../utils/solidity';
import fs from 'fs';
import { CompoundKeyEncoder, NodeSelectors } from '@downstream/core';

const deploy = {
    command: 'deploy <id>',
    describe: 'deploy a building kind extension',
    builder: (yargs) =>
        yargs
            .positional('id', {
                describe: 'your extension id',
                type: 'number',
            })
            .option('plugin', {
                describe: 'path to plugin javascript',
                type: 'string',
            })
            .option('name', {
                describe: 'name of building kind',
                type: 'string',
            })
            .option('contract', {
                describe: 'path to extension solidity',
                type: 'string',
            })
            .option('include', {
                describe: 'library include path to search for imports',
                type: 'string',
            })
            .option('material', {
                describe: 'construction material json `[{"item": "0x...", "qty": 25}, ...]`',
                type: 'string',
            })
            .option('inputs', {
                describe: 'crafting recipe inputs json `[{"item": "0x...", "qty": 10}, ...]`',
                type: 'string',
            })
            .option('outputs', {
                describe: 'crafting recipe outputs json `[{"item": "0x...", "qty": 10}, ...]`',
                type: 'string',
            })
            .demand(['id', 'name', 'materials'])
            .check((argv) => {
                if (typeof argv.id !== 'undefined' && argv.id < 1) {
                    throw new Error(`id must be greater than 1`);
                }
                return true;
            }),
    handler: async (ctx) => {
        const player = await ctx.player();

        // pick kind id
        const kind = CompoundKeyEncoder.encodeUint160(NodeSelectors.BuildingKind, ctx.id);

        // register kind
        const materials = JSON.parse(ctx.materials);
        const materialItems = [0, 0, 0, 0].map((_, idx) =>
            materials[idx] ? materials[idx].item : '0x000000000000000000000000000000000000000000000000'
        );
        const materialQtys = [0, 0, 0, 0].map((_, idx) => (materials[idx] ? materials[idx].qty : 0));
        await player.dispatch({
            name: 'REGISTER_BUILDING_KIND',
            args: [kind, ctx.name, materialItems, materialQtys],
        });
        console.log(`kind ${kind} registered`);

        // compile and deploy an implementation if given
        if (ctx.contract) {
            const libs = [
                // FIXME: these libs only work for a forge project
                path.dirname(ctx.contract),
                path.join(path.dirname(ctx.contract), '..'),
                path.join(path.dirname(ctx.contract), '..', 'lib/ds/contracts/lib/cog/contracts/'),
            ];
            console.log('libs', libs);
            const { bytecode } = compile(ctx.contract, libs);
            // call  to deploy an implementation
            await player.dispatch({
                name: 'DEPLOY_KIND_IMPLEMENTATION',
                args: [kind, `0x${bytecode}`],
            });
            console.log(`set implementation for kind ${kind}`);
        } else {
            console.log('no implementation contract provided');
        }

        // deploy client plugin if given
        if (ctx.plugin) {
            if (!fs.existsSync(ctx.plugin)) {
                throw new Error(`plugin source not found: ${ctx.plugin}`);
            }
            const plugin = CompoundKeyEncoder.encodeUint160(NodeSelectors.ClientPlugin, ctx.id);
            const js = fs.readFileSync(ctx.plugin, 'utf8').toString();
            await player.dispatch({
                name: 'REGISTER_KIND_PLUGIN',
                args: [plugin, kind, ctx.name, js],
            });
            console.log(`set client plugin for kind ${kind}`);
        }

        // register crafting recipe if given
        if (ctx.outputs || ctx.inputs) {
            const inputs = ctx.inputs ? JSON.parse(ctx.inputs) : [];
            const outputs = ctx.outputs ? JSON.parse(ctx.outputs) : [];
            if (outputs.length !== 1) {
                throw new Error('crafting recipe must specify exactly 1 output');
            }
            if (inputs.length === 0) {
                throw new Error('crafting recipe must specify at least 1 input');
            }
            const inputQtys = [0, 0, 0, 0].map((_, idx) => (inputs[idx] ? inputs[idx].qty : 0));
            const inputItems = [0, 0, 0, 0].map((_, idx) =>
                inputs[idx] ? inputs[idx].item : '0x000000000000000000000000000000000000000000000000'
            );
            const outputQtys = [0].map((_, idx) => (outputs[idx] ? outputs[idx].qty : 0));
            const outputItems = [0].map((_, idx) =>
                outputs[idx] ? outputs[idx].item : '0x000000000000000000000000000000000000000000000000'
            );
            await player.dispatch({
                name: 'REGISTER_CRAFT_RECIPE',
                args: [kind, inputItems, inputQtys, outputItems[0], outputQtys[0]],
            });
        }

        ctx.output.write('ok');
        process.exit(0);
    },
};

export const command = {
    command: 'building-kinds',
    aliases: ['building-kind'],
    describe: 'list/show/deploy building kind extensions',
    builder: (yargs) => yargs.command(deploy).demandCommand(),
};

export default command;

// ds id claim <id>
// ds id list --owner 0x0...
// ds building-kind list
// ds kinds
//
// TODO:
//
// * optional --compiler=[forge|hardhat|truffle|solc|internal] to use other tools as compiler
// *
