import path from 'path';
import { compile } from '../utils/solidity';
import fs from 'fs';
import { CogAction, CompoundKeyEncoder, NodeSelectors } from '@downstream/core';
import { Manifest } from 'src/utils/manifest';
import { solidityPacked } from 'ethers';
import YAML from 'yaml';

const encodeItemID = ({ id, stackable, goo }) => {
    return solidityPacked(
        ['bytes4', 'uint32', 'uint32', 'uint32', 'uint32', 'uint32'],
        [NodeSelectors.Item, id, stackable ? 1 : 0, goo.green, goo.blue, goo.red]
    );
};

const encodeBuildingID = ({ id }) => {
    return CompoundKeyEncoder.encodeUint160(NodeSelectors.BuildingKind, id);
};

const dereferenceManifestID = (key, matchKinds, manifest): string => {
    if (key.startsWith('0x')) {
        // key is already an id
        return key;
    }
    const kinds = manifest.kinds.filter((k) => matchKinds.includes(k.kind)).filter((k) => k.name === key);
    if (kinds.length === 0) {
        throw new Error(`unable to find id for reference: ${key}`);
    }
    if (kinds.length > 1) {
        throw new Error(
            `ambiguous id for reference: ${key} matched ${kinds.length} different kinds within the manifest`
        );
    }
    const kind = kinds[0];
    if (kind.kind === 'building') {
        return encodeBuildingID(kind);
    } else if (kind.kind === 'item') {
        return encodeItemID(kind);
    } else {
        throw new Error(`unable to generate id for reference: ${key}: no id generation implemention`);
    }
};

const encodeSlotConfig = (slots, manifest) => {
    const items = [0, 0, 0, 0]
        .map((_, idx) => (slots[idx] ? slots[idx].item : '0x000000000000000000000000000000000000000000000000'))
        .map((item) => dereferenceManifestID(item, ['item'], manifest));
    const quantities = [0, 0, 0, 0].map((_, idx) => (slots[idx] ? slots[idx].quantity : 0));
    return { items, quantities };
};

const buildingDeploymentActions = async (kind, manifest): Promise<CogAction[]> => {
    const ops: CogAction[] = [];

    // pick kind id
    const id = encodeBuildingID(kind);

    // register kind + construction materials
    const { items: materialItems, quantities: materialQtys } = encodeSlotConfig(kind.materials, manifest);
    ops.push({
        name: 'REGISTER_BUILDING_KIND',
        args: [id, kind.name, materialItems, materialQtys],
    });

    // compile and deploy an implementation if given
    if (kind.contract.file) {
        const LIB_PATHS = [
            // FIXME: these libs only work for a forge project
            path.dirname(kind.contract.file),
            path.join(path.dirname(kind.contract.file), '..'),
            path.join(path.dirname(kind.contract.file), '..', 'lib/ds/contracts/lib/cog/contracts/'),
        ];
        const { bytecode } = compile(kind.contract.file, LIB_PATHS);
        // call  to deploy an implementation
        ops.push({
            name: 'DEPLOY_KIND_IMPLEMENTATION',
            args: [id, `0x${bytecode}`],
        });
        // console.log(`set implementation for kind ${kind}`);
    } else {
        // console.log('no implementation contract provided');
    }

    // deploy client plugin if given
    if (kind.plugin.file) {
        if (!fs.existsSync(kind.plugin.file)) {
            throw new Error(`plugin source not found: ${kind.plugin.file}`);
        }
        const plugin = CompoundKeyEncoder.encodeUint160(NodeSelectors.ClientPlugin, kind.id);
        const js = fs.readFileSync(kind.plugin.file, 'utf8').toString();
        ops.push({
            name: 'REGISTER_KIND_PLUGIN',
            args: [plugin, id, kind.name, js],
        });
        // console.log(`set client plugin for kind ${kind}`);
    }

    // register crafting recipe if given
    if ((kind.outputs && kind.outputs.length > 0) || (kind.inputs && kind.inputs.length > 0)) {
        if (kind.outputs.length !== 1) {
            throw new Error('crafting recipe must specify exactly 1 output');
        }
        if (kind.inputs.length === 0) {
            throw new Error('crafting recipe must specify at least 1 input');
        }
        const { items: inputItems, quantities: inputQtys } = encodeSlotConfig(kind.inputs || [], manifest);
        const { items: outputItems, quantities: outputQtys } = encodeSlotConfig(kind.outputs || [], manifest);
        ops.push({
            name: 'REGISTER_CRAFT_RECIPE',
            args: [id, inputItems, inputQtys, outputItems[0], outputQtys[0]],
        });
    }

    return ops;
};

const deploy = {
    command: 'deploy <manifest>',
    describe: 'deploy an extension manifest',
    builder: (yargs) =>
        yargs
            .positional('manifest', {
                describe: 'path to manifest',
                type: 'string',
            })
            .option('dry-run', {
                describe: 'show changes that would be applied',
                type: 'boolean',
            })
            .check((ctx) => {
                if (!fs.existsSync(ctx.manifest)) {
                    throw new Error(`file not found: ${ctx.manifest}`);
                }
                return true;
            })
            .demand(['manifest']),
    handler: async (ctx) => {
        // read manifest
        const content = YAML.parse(fs.readFileSync(ctx.manifest).toString());
        const result = Manifest.safeParse(content);
        if (!result.success) {
            throw new Error(result.error.issues.map((iss) => `${iss.path.join('.')} ${iss.message}`).join('\n\n'));
        }
        const manifest = result.data;

        // build list of operations
        let ops: CogAction[] = [];
        const notes: string[] = [];

        // process item kinds first
        for (const k of manifest.kinds) {
            if (k.kind != 'item') {
                continue;
            }
            const itemID = solidityPacked(
                ['bytes4', 'uint32', 'uint32', 'uint32', 'uint32', 'uint32'],
                [NodeSelectors.Item, k.id, k.stackable ? 1 : 0, k.goo.green, k.goo.blue, k.goo.red]
            );
            ops = [
                ...ops,
                {
                    name: 'REGISTER_ITEM_KIND',
                    args: [itemID, k.name, k.icon],
                },
            ];
            notes.push(`✅ registered item ${k.name} (${itemID})`);
        }

        // process building kinds
        for (const k of manifest.kinds) {
            if (k.kind != 'building') {
                continue;
            }
            const actions = await buildingDeploymentActions(k, manifest);
            ops = [...ops, ...actions];
            notes.push(`✅ registered building ${k.name} (${encodeBuildingID(k)})`);
        }

        // dump the dry run of ops
        console.log('The following actions will be performed:');
        console.log(ops.map((op) => `    ${op.name}}`).join('\n'));
        console.log('');

        // abort here if dry-run
        if (ctx.dryRun) {
            process.exit(0);
            return;
        }

        // ask player to dispatch the ops
        const player = await ctx.player();
        await player.dispatch(...ops);

        // done!
        console.log(notes.join('\n'));
        process.exit(0);
    },
};

export default deploy;
