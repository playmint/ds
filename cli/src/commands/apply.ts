import path from 'path';
import { compile } from '../utils/solidity';
import fs from 'fs';
import { CogAction, CompoundKeyEncoder, NodeSelectors } from '@downstream/core';
import { Manifest, Spec, Slot } from 'src/utils/manifest';
import { solidityPacked, id as keccak256UTF8 } from 'ethers';
import YAML from 'yaml';
import { globSync } from 'glob';

const encodeItemID = ({ name, stackable, goo }) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`item/${name}`))));
    return solidityPacked(
        ['bytes4', 'uint32', 'uint32', 'uint32', 'uint32', 'uint32'],
        [NodeSelectors.Item, id, stackable ? 1 : 0, goo.green, goo.blue, goo.red]
    );
};

const encodeBuildingID = ({ name }) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`building/${name}`))));
    return CompoundKeyEncoder.encodeUint160(NodeSelectors.BuildingKind, id);
};

const encodePluginID = ({ name }) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`plugin/${name}`))));
    return CompoundKeyEncoder.encodeUint160(NodeSelectors.ClientPlugin, id);
};

const dereferenceManifestID = (
    key: string,
    matchKinds: string[],
    manifests: ReturnType<typeof Manifest.parse>[]
): string => {
    if (key.startsWith('0x')) {
        // key is already an id
        return key;
    }
    const specs = manifests
        .map((manifest) => manifest.spec)
        .filter((spec) => matchKinds.includes(spec.kind))
        .filter((spec) => spec.name === key);
    if (specs.length === 0) {
        throw new Error(`unable to find id for reference: ${key}`);
    }
    if (specs.length > 1) {
        throw new Error(
            `ambiguous id for reference: ${key} matched ${specs.length} different kinds within the manifest`
        );
    }
    const spec = specs[0];
    if (spec.kind === 'building') {
        return encodeBuildingID(spec);
    } else if (spec.kind === 'item') {
        return encodeItemID(spec);
    } else {
        throw new Error(`unable to generate id for reference: ${key}: no id generation implemention`);
    }
};

const encodeSlotConfig = (slots: ReturnType<typeof Slot.parse>[], manifests: ReturnType<typeof Manifest.parse>[]) => {
    const items = [0, 0, 0, 0]
        .map((_, idx) => (slots[idx] ? slots[idx].item : '0x000000000000000000000000000000000000000000000000'))
        .map((item) => dereferenceManifestID(item, ['item'], manifests));
    const quantities = [0, 0, 0, 0].map((_, idx) => (slots[idx] ? slots[idx].quantity : 0));
    return { items, quantities };
};

const buildingDeploymentActions = async (
    manifest: ReturnType<typeof Manifest.parse>,
    manifests: ReturnType<typeof Manifest.parse>[]
): Promise<CogAction[]> => {
    const ops: CogAction[] = [];
    const manifestDir = path.dirname(manifest.filename);
    const spec = manifest.spec;

    if (spec.kind != 'building') {
        throw new Error(`expected building kind spec`);
    }

    // pick kind id
    const id = encodeBuildingID(manifest.spec);

    // register kind + construction materials
    const { items: materialItems, quantities: materialQtys } = encodeSlotConfig(spec.materials, manifests);
    ops.push({
        name: 'REGISTER_BUILDING_KIND',
        args: [id, spec.name, materialItems, materialQtys],
    });

    // compile and deploy an implementation if given
    if (spec.contract && spec.contract.file) {
        const relativeFilename = path.join(manifestDir, spec.contract.file);

        const libs = [path.join(path.dirname(relativeFilename)), ...(spec.contract.includes || [])];
        const { bytecode } = compile(relativeFilename, { libs });
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
    if (spec.plugin && spec.plugin.file) {
        const relativeFilename = path.join(manifestDir, spec.plugin.file);
        if (!fs.existsSync(relativeFilename)) {
            throw new Error(`plugin source not found: ${spec.plugin.file}`);
        }
        const pluginID = encodePluginID(manifest.spec); // use building name for plugin id
        const js = fs.readFileSync(relativeFilename, 'utf8').toString();
        ops.push({
            name: 'REGISTER_KIND_PLUGIN',
            args: [pluginID, id, spec.name, js],
        });
        // console.log(`set client plugin for spec ${spec}`);
    }

    // register crafting recipe if given
    if ((spec.outputs && spec.outputs.length > 0) || (spec.inputs && spec.inputs.length > 0)) {
        if (spec.outputs.length !== 1) {
            throw new Error('crafting recipe must specify exactly 1 output');
        }
        if (spec.inputs.length === 0) {
            throw new Error('crafting recipe must specify at least 1 input');
        }
        const { items: inputItems, quantities: inputQtys } = encodeSlotConfig(spec.inputs || [], manifests);
        const { items: outputItems, quantities: outputQtys } = encodeSlotConfig(spec.outputs || [], manifests);
        ops.push({
            name: 'REGISTER_CRAFT_RECIPE',
            args: [id, inputItems, inputQtys, outputItems[0], outputQtys[0]],
        });
    }

    return ops;
};

const getManifestFilenames = (filename: string, isRecursive: boolean): string[] => {
    const isDirectory = fs.lstatSync(filename).isDirectory();
    if (isDirectory) {
        if (!isRecursive) {
            throw new Error(`${filename} is a directory. use --recursive to apply all manifests in a directory`);
        }
        return globSync(path.join(filename, '**/*.yaml'));
    } else if (isRecursive) {
        throw new Error(`--filename must be a directory when used with --recursive`);
    } else {
        return [filename];
    }
};

const getManifests = (filename: string): ReturnType<typeof Manifest.parse>[] => {
    const filedata = fs.readFileSync(filename).toString();
    return YAML.parseAllDocuments(filedata)
        .map((content) => content.toJS())
        .map((content: any) => {
            const result = Spec.safeParse(content);
            if (!result.success) {
                throw new Error(
                    result.error.issues
                        .map(
                            (iss) => `invalid manifest ${filename}: ${iss.path.join('.')} field invalid: ${iss.message}`
                        )
                        .join('\n\n')
                );
            }
            return Manifest.safeParse({ spec: result.data, filename });
        })
        .map((result) => {
            if (!result.success) {
                throw new Error(
                    result.error.issues.map((iss) => `${filename} ${iss.path.join('.')} ${iss.message}`).join('\n\n')
                );
            }
            return result.data;
        });
};

const deploy = {
    command: 'apply',
    describe: 'deploy an extension configuration to the game',
    builder: (yargs) =>
        yargs
            .option('filename', {
                alias: 'f',
                describe: 'the file(s) that contain the configurations to apply',
                type: 'string',
            })
            .option('recursive', {
                alias: 'R',
                describe:
                    'process the directory used in -f, --filename recursively. Useful when you want to manage related manifests organized within the same directory',
                type: '',
            })
            .option('dry-run', {
                describe: 'show changes that would be applied',
                type: 'boolean',
            })
            .check((ctx) => {
                if (!fs.existsSync(ctx.filename)) {
                    throw new Error(`file not found: ${ctx.filename}`);
                }
                return true;
            })
            .demand(['filename']),
    handler: async (ctx) => {
        const manifestFilenames = getManifestFilenames(ctx.filename, ctx.recursive);
        const manifests = manifestFilenames.flatMap(getManifests);

        // build list of operations
        let ops: CogAction[] = [];
        const notes: string[] = [];

        // process item kinds first
        for (const manifest of manifests) {
            if (manifest.spec.kind != 'item') {
                continue;
            }
            const itemID = encodeItemID(manifest.spec);
            ops = [
                ...ops,
                {
                    name: 'REGISTER_ITEM_KIND',
                    args: [itemID, manifest.spec.name, manifest.spec.icon],
                },
            ];
            notes.push(`✅ registered item ${manifest.spec.name} (${itemID})`);
        }

        // process building kinds
        for (const manifest of manifests) {
            if (manifest.spec.kind != 'building') {
                continue;
            }
            const actions = await buildingDeploymentActions(manifest, manifests);
            ops = [...ops, ...actions];
            notes.push(`✅ registered building ${manifest.spec.name} (${encodeBuildingID(manifest.spec)})`);
        }

        // dump the dry run of ops
        console.log('The following actions will be performed:');
        console.log(ops.map((op) => `    ${op.name}`).join('\n'));
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
