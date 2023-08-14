import { CogAction, CompoundKeyEncoder, NodeSelectors } from '@downstream/core';
import { id as keccak256UTF8, solidityPacked } from 'ethers';
import fs from 'fs';
import glob from 'glob';
import path from 'path';
import { ItemSpec, ManifestDocument, Slot, readManifestsDocumentsSync } from '../utils/manifest';
import { compile } from '../utils/solidity';
import { getManifestsByKind } from './get';

const encodeItemID = ({ name, stackable, goo }: ReturnType<typeof ItemSpec.parse>) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`item/${name}`))));
    return solidityPacked(
        ['bytes4', 'uint32', 'uint32', 'uint32', 'uint32', 'uint32'],
        [NodeSelectors.Item, id, stackable ? 1 : 0, goo.green, goo.blue, goo.red]
    );
};

const encodeBuildingKindID = ({ name }) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`building/${name}`))));
    return CompoundKeyEncoder.encodeUint160(NodeSelectors.BuildingKind, id);
};

const encodePluginID = ({ name }) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`plugin/${name}`))));
    return CompoundKeyEncoder.encodeUint160(NodeSelectors.ClientPlugin, id);
};

const buildingKindDeploymentActions = async (
    ctx,
    file: ReturnType<typeof ManifestDocument.parse>,
    files: ReturnType<typeof ManifestDocument.parse>[],
    verbose: boolean
): Promise<CogAction[]> => {
    const ops: CogAction[] = [];
    const manifestDir = path.dirname(file.filename);
    const existingItems = await getManifestsByKind(ctx, ['Item']);

    if (file.manifest.kind != 'BuildingKind') {
        throw new Error(`expected building kind spec`);
    }
    const spec = file.manifest.spec;

    const getItemIdByName = (name: string): string => {
        const foundItems = existingItems.filter(({ kind, spec }) => kind === 'Item' && spec.name === name);
        if (foundItems.length === 1) {
            const manifest = foundItems[0];
            if (manifest.kind !== 'Item') {
                throw new Error(`unexpect kind`);
            }
            if (!manifest.status || !manifest.status.id) {
                throw new Error(`missing status.id field for Item ${name}`);
            }
            return manifest.status.id;
        } else if (foundItems.length > 1) {
            throw new Error(`item ${name} is ambiguous, found ${foundItems.length} existing items with that name`);
        }
        // find ID based on pending specs
        const manifests = files
            .map((file) => file.manifest)
            .filter((manifest) => manifest.kind === 'Item' && manifest.spec.name === name);
        if (manifests.length === 0) {
            throw new Error(`unable to find Item id for reference: ${name}, are you missing an Item manifest?`);
        }
        if (manifests.length > 1) {
            throw new Error(
                `item ${name} is ambiguous, found ${manifests.length} different manifests that declare items with that name`
            );
        }
        const manifest = manifests[0];
        if (manifest.kind !== 'Item') {
            throw new Error(`unexpected kind: wanted Item got ${manifest.kind}`);
        }
        return encodeItemID(manifest.spec);
    };

    const encodeSlotConfig = (slots: ReturnType<typeof Slot.parse>[]) => {
        const items = [0, 0, 0, 0].map((_, idx) =>
            slots[idx] ? getItemIdByName(slots[idx].name) : '0x000000000000000000000000000000000000000000000000'
        );
        const quantities = [0, 0, 0, 0].map((_, idx) => (slots[idx] ? slots[idx].quantity : 0));
        return { items, quantities };
    };

    // pick kind id
    const id = encodeBuildingKindID(spec);

    // register kind + construction materials
    const { items: materialItems, quantities: materialQtys } = encodeSlotConfig(spec.materials);
    ops.push({
        name: 'REGISTER_BUILDING_KIND',
        args: [id, spec.name, materialItems, materialQtys],
    });

    // compile and deploy an implementation if given
    if (spec.category != 'blocker' && spec.contract && spec.contract.file) {
        const relativeFilename = path.join(manifestDir, spec.contract.file);
        const libs = [path.join(path.dirname(relativeFilename)), ...(spec.contract.includes || [])];
        const { bytecode } = compile(relativeFilename, { libs, verbose });
        // call  to deploy an implementation
        ops.push({
            name: 'DEPLOY_KIND_IMPLEMENTATION',
            args: [id, `0x${bytecode}`],
        });
    }

    // deploy client plugin if given
    if (spec.category != 'blocker' && spec.plugin && spec.plugin.file) {
        const relativeFilename = path.join(manifestDir, spec.plugin.file);
        if (!fs.existsSync(relativeFilename)) {
            throw new Error(`plugin source not found: ${spec.plugin.file}`);
        }
        const pluginID = encodePluginID(spec); // use building name for plugin id
        const js = fs.readFileSync(relativeFilename, 'utf8').toString();
        ops.push({
            name: 'REGISTER_KIND_PLUGIN',
            args: [pluginID, id, spec.name, js],
        });
    }

    // register crafting recipe if given
    if (spec.category == 'factory') {
        if (!Array.isArray(spec.outputs) || spec.outputs.length !== 1) {
            throw new Error('crafting recipe must specify exactly 1 output');
        }
        if (!Array.isArray(spec.inputs) || spec.inputs.length === 0) {
            throw new Error('crafting recipe must specify at least 1 input');
        }
        const { items: inputItems, quantities: inputQtys } = encodeSlotConfig(spec.inputs || []);
        const { items: outputItems, quantities: outputQtys } = encodeSlotConfig(spec.outputs || []);
        ops.push({
            name: 'REGISTER_CRAFT_RECIPE',
            args: [id, inputItems, inputQtys, outputItems[0], outputQtys[0]],
        });
    }

    // set the model annotation
    // TODO: remove once extractor stuff is in
    ops.push({
        name: 'DEV_SET_MODEL',
        args: [id, spec.model],
    });

    return ops;
};

const getManifestFilenames = (filename: string, isRecursive: boolean): string[] => {
    if (filename === '-') {
        return [filename];
    }
    const isDirectory = fs.lstatSync(filename).isDirectory();
    if (isDirectory) {
        if (!isRecursive) {
            throw new Error(`${filename} is a directory. use --recursive to apply all manifests in a directory`);
        }
        return glob.sync(path.join(filename, '**/*.yaml'));
    } else if (isRecursive) {
        throw new Error(`--filename must be a directory when used with --recursive`);
    } else {
        return [filename];
    }
};

const deploy = {
    command: 'apply',
    describe: 'deploy an extension configuration to the game',
    builder: (yargs) =>
        yargs
            .option('filename', {
                alias: 'f',
                describe: 'path to manifest that contain the configurations to apply, use "-" to read from stdin',
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
            .option('batch', {
                describe: 'number of actions to bundle together per batch',
                default: 10,
                type: 'number',
            })
            .check((ctx) => {
                if (ctx.filename === '-') {
                    return true;
                }
                if (!fs.existsSync(ctx.filename)) {
                    throw new Error(`file not found: ${ctx.filename}`);
                }
                return true;
            })
            .demand(['filename'])
            .example([
                ['$0 apply -f ./manifest.yaml', 'Apply a single manifest'],
                ['$0 apply -R -f .', 'Apply ALL manifests in directory'],
            ]),
    handler: async (ctx) => {
        const manifestFilenames = getManifestFilenames(ctx.filename, ctx.recursive);
        const docs = (await Promise.all(manifestFilenames.map(readManifestsDocumentsSync))).flatMap((docs) => docs);

        // build list of operations
        let ops: CogAction[] = [];
        const notes: string[] = [];

        // process item kinds first
        for (const doc of docs) {
            if (doc.manifest.kind != 'Item') {
                continue;
            }
            const spec = doc.manifest.spec;
            const itemID = encodeItemID(spec);
            ops = [
                ...ops,
                {
                    name: 'REGISTER_ITEM_KIND',
                    args: [itemID, spec.name, spec.icon],
                },
            ];
            notes.push(`✅ registered item ${spec.name} (${itemID})`);
        }

        // process building kinds
        for (const doc of docs) {
            if (doc.manifest.kind != 'BuildingKind') {
                continue;
            }
            const actions = await buildingKindDeploymentActions(ctx, doc, docs, ctx.verbose);
            ops = [...ops, ...actions];
            notes.push(`✅ registered building ${doc.manifest.spec.name} (${encodeBuildingKindID(doc.manifest.spec)})`);
        }

        // spawn building instances
        for (const doc of docs) {
            if (doc.manifest.kind != 'Building') {
                continue;
            }
            const spec = doc.manifest.spec;
            ops = [
                ...ops,
                {
                    name: 'DEV_SPAWN_BUILDING',
                    args: [encodeBuildingKindID(spec), ...spec.location],
                },
            ];
            notes.push(`✅ spawned building instance of ${spec.name} at ${spec.location.join(',')}`);
        }

        // spawn tile manifests (this is only valid while cheats are enabled)
        for (const doc of docs) {
            if (doc.manifest.kind != 'Tile') {
                continue;
            }
            const spec = doc.manifest.spec;
            ops = [
                ...ops,
                {
                    name: 'DEV_SPAWN_TILE',
                    args: spec.location,
                },
            ];
            notes.push(`✅ spawned tile ${spec.location.join(',')}`);
        }
        //

        // dump the dry run of ops

        // abort here if dry-run
        if (ctx.dryRun) {
            console.error('The following actions will be performed:');
            console.error(
                ops.map((op) => `    ${op.name}(${op.args.map((arg) => JSON.stringify(arg)).join(', ')})`).join('\n')
            );
            console.error('');
            process.exit(0);
            return;
        }

        // authenticate player
        const player = await ctx.player();

        // apply the ops
        while (ops.length !== 0) {
            const batch = ops.splice(0, ctx.batch);
            if (ctx.slow) {
                for (const op of batch) {
                    await player.dispatch(op);
                }
            } else {
                await player.dispatch(...batch);
            }
        }

        // done!
        console.log(notes.join('\n'));
        process.exit(0);
    },
};

export default deploy;
