import { CogAction, CompoundKeyEncoder, NodeSelectors } from '@downstream/core';
import { id as keccak256UTF8, solidityPacked, AbiCoder } from 'ethers';
import fs from 'fs';
import { globSync } from 'glob';
import path from 'path';
import {
    ItemSpec,
    ManifestDocument,
    Slot,
    readManifestsDocumentsSync,
    BuildingCategoryEnumVals,
    BuildingCategoryEnum,
} from '../utils/manifest';
import { compile } from '../utils/solidity';
import { getManifestsByKind } from './get';
import { z } from 'zod';

const encodeItemID = ({ name, stackable, goo }: ReturnType<typeof ItemSpec.parse>) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`item/${name}`))));
    return solidityPacked(
        ['bytes4', 'uint32', 'uint32', 'uint32', 'uint32', 'uint32'],
        [NodeSelectors.Item, id, stackable ? 1 : 0, goo.green, goo.blue, goo.red]
    );
};

const encodeBuildingKindID = ({ name, category }) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`building/${name}`))));
    const categoryEnum = getBuildingCategoryEnum(category);
    return solidityPacked(['bytes4', 'uint32', 'uint64', 'uint64'], [NodeSelectors.BuildingKind, 0, id, categoryEnum]);
};

const encodePluginID = ({ name }) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`plugin/${name}`))));
    return CompoundKeyEncoder.encodeUint160(NodeSelectors.ClientPlugin, id);
};

const encodeTaskID = ({ name, kind }) => {
    const id = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(`task/${name}`))));
    const kindHash = Number(BigInt.asUintN(32, BigInt(keccak256UTF8(kind))));

    return solidityPacked(
        ['bytes4', 'uint32', 'uint32', 'uint32', 'uint32', 'uint32'],
        [NodeSelectors.Task, 0, 0, 0, kindHash, id]
    );
};

const encodeQuestID = ({ name }) => {
    const id = BigInt.asUintN(64, BigInt(keccak256UTF8(`quest/${name}`)));
    return solidityPacked(['bytes4', 'uint32', 'uint64', 'uint64'], [NodeSelectors.Quest, 0, 0, id]);
};

// TODO: Is there a way of referencing the Solidity enum?
const getBuildingCategoryEnum = (category: BuildingCategoryEnum): number => {
    return BuildingCategoryEnumVals.indexOf(category);
};

const itemKindDeploymentActions = async (
    _ctx,
    file: ReturnType<typeof ManifestDocument.parse>,
    _files: ReturnType<typeof ManifestDocument.parse>[],
    verbose: boolean
): Promise<CogAction[]> => {
    const ops: CogAction[] = [];
    if (file.manifest.kind != 'Item') {
        throw new Error(`expected Item kind spec`);
    }
    const manifestDir = path.dirname(file.filename);
    const spec = file.manifest.spec;

    const id = encodeItemID(spec);
    ops.push({
        name: 'REGISTER_ITEM_KIND',
        args: [id, spec.name, spec.icon],
    });

    if (spec.plugin && spec.plugin.file) {
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

    if (spec.contract && spec.contract.file) {
        const relativeFilename = path.join(manifestDir, spec.contract.file);
        const libs = [path.join(path.dirname(relativeFilename)), ...(spec.contract.includes || [])];
        const { bytecode } = await compile(relativeFilename, { libs, verbose });
        // call  to deploy an implementation
        ops.push({
            name: 'DEPLOY_KIND_IMPLEMENTATION',
            args: [id, `0x${bytecode}`],
        });
    }

    return ops;
};

const getItemIdByName = (files, existingItems, name: string): string => {
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

    const encodeSlotConfig = (slots: ReturnType<typeof Slot.parse>[]) => {
        const items = [0, 0, 0, 0].map((_, idx) =>
            slots[idx]
                ? getItemIdByName(files, existingItems, slots[idx].name)
                : '0x000000000000000000000000000000000000000000000000'
        );
        const quantities = [0, 0, 0, 0].map((_, idx) => (slots[idx] ? slots[idx].quantity : 0));
        return { items, quantities };
    };

    // pick kind id
    const id = encodeBuildingKindID(spec);

    // convert category string to Solidity enum
    const buildingCategoryEnum = getBuildingCategoryEnum(spec.category);
    if (buildingCategoryEnum === -1) {
        throw new Error(`building category '${spec.category}' does not exist on enum`);
    }

    // input / output items
    const null24bytes = '0x000000000000000000000000000000000000000000000000';
    let inputItems: string[] = [null24bytes, null24bytes, null24bytes, null24bytes];
    let inputQtys: number[] = [0, 0, 0, 0];
    let outputItems: string[] = [null24bytes];
    let outputQtys: number[] = [0];

    if (spec.category == 'factory') {
        if (!Array.isArray(spec.outputs) || spec.outputs.length !== 1) {
            throw new Error('crafting recipe must specify exactly 1 output');
        }
        if (!Array.isArray(spec.inputs) || spec.inputs.length === 0) {
            throw new Error('crafting recipe must specify at least 1 input');
        }

        const input = encodeSlotConfig(spec.inputs || []);
        inputItems = input.items;
        inputQtys = input.quantities;

        const output = encodeSlotConfig(spec.outputs || []);
        outputItems = output.items.slice(0, 1);
        outputQtys = output.quantities.slice(0, 1);
    }

    if (spec.category == 'extractor') {
        if (!Array.isArray(spec.outputs) || spec.outputs.length !== 1) {
            throw new Error('extractor must specify exactly 1 output');
        }

        const output = encodeSlotConfig(spec.outputs || []);
        outputItems = output.items.slice(0, 1);
        outputQtys = output.quantities.slice(0, 1);
    }

    // register kind + construction materials
    const { items: materialItems, quantities: materialQtys } = encodeSlotConfig(spec.materials);
    ops.push({
        name: 'REGISTER_BUILDING_KIND',
        args: [
            id,
            spec.name,
            buildingCategoryEnum,
            spec.model,
            materialItems,
            materialQtys,
            inputItems,
            inputQtys,
            outputItems,
            outputQtys,
        ],
    });

    // compile and deploy an implementation if given
    if (spec.category != 'blocker' && spec.contract && spec.contract.file) {
        const relativeFilename = path.join(manifestDir, spec.contract.file);
        const libs = [path.join(path.dirname(relativeFilename)), ...(spec.contract.includes || [])];
        const { bytecode } = await compile(relativeFilename, { libs, verbose });
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

    if (spec.description && spec.description.length > 3) {
        ops.push({
            name: 'DESCRIBE_OWNED_ENTITY',
            args: [id, spec.description],
        });
    }

    return ops;
};

const questDeploymentActions = async (
    ctx,
    file: ReturnType<typeof ManifestDocument.parse>,
    files: ReturnType<typeof ManifestDocument.parse>[],
    verbose: boolean
): Promise<CogAction[]> => {
    const ops: CogAction[] = [];

    if (file.manifest.kind != 'Quest') {
        throw new Error(`expected quest kind spec`);
    }
    const spec = file.manifest.spec;
    const existingItems = await getManifestsByKind(ctx, ['Item']);

    const encodeTaskData = (task: (typeof spec.tasks)[0]) => {
        switch (task.kind) {
            case 'coord': {
                const coder = AbiCoder.defaultAbiCoder();
                return coder.encode(['int16', 'int16', 'int16'], [...task.location]);
            }
            case 'inventory': {
                const item = getItemIdByName(files, existingItems, task.item.name);
                const coder = AbiCoder.defaultAbiCoder();
                return coder.encode(['bytes24', 'uint64'], [item, task.item.quantity]);
            }
        }

        return solidityPacked(['uint8'], [0]);
    };

    // register tasks
    ops.push(
        ...spec.tasks.map((task): CogAction => {
            const id = encodeTaskID(task);
            const taskData = encodeTaskData(task);
            return {
                name: 'REGISTER_TASK',
                args: [id, task.name, taskData],
            };
        })
    );

    // register quest
    const questId = encodeQuestID(spec);
    const taskIds = spec.tasks.map((task) => encodeTaskID(task));
    const [q, r, s] = spec.location ? spec.location : [0, 0, 0];
    ops.push({
        name: 'REGISTER_QUEST',
        args: [questId, spec.name, spec.description, !!spec.location, q, r, s, taskIds],
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
        return globSync(path.join(filename, '**/*.yaml'));
    } else if (isRecursive) {
        throw new Error(`--filename must be a directory when used with --recursive`);
    } else {
        return [filename];
    }
};

const getBuildingKindIDByName = (existingBuildingKinds, pendingBuildingKinds, name: string) => {
    const foundBuildingKinds = existingBuildingKinds.filter(
        ({ kind, spec }) => kind === 'BuildingKind' && spec.name === name
    );
    if (foundBuildingKinds.length === 1) {
        const manifest = foundBuildingKinds[0];
        if (manifest.kind !== 'BuildingKind') {
            throw new Error(`unexpect kind`);
        }
        if (!manifest.status || !manifest.status.id) {
            throw new Error(`missing status.id field for BuildingKind ${name}`);
        }
        return manifest.status.id;
    } else if (foundBuildingKinds.length > 1) {
        throw new Error(
            `BuildingKind ${name} is ambiguous, found ${foundBuildingKinds.length} existing BuildingKinds with that name`
        );
    }
    // find ID based on pending specs
    const manifests = pendingBuildingKinds.filter((m) => m.spec.name == name);
    if (manifests.length === 0) {
        throw new Error(
            `unable to find BuildingKind id for reference: ${name}, are you missing an BuildingKind manifest?`
        );
    }
    if (manifests.length > 1) {
        throw new Error(
            `BuildingKind ${name} is ambiguous, found ${manifests.length} different manifests that declare BuildingKinds with that name`
        );
    }
    const manifest = manifests[0];
    if (manifest.kind !== 'BuildingKind') {
        throw new Error(`unexpected kind: wanted BuildingKind got ${manifest.kind}`);
    }
    return encodeBuildingKindID(manifest.spec);
};

type Op = {
    doc: z.infer<typeof ManifestDocument>;
    actions: CogAction[];
    note: string;
};

type OpSet = Op[];

type OpResult = {
    ok: boolean;
    err?: Error;
    op: Op;
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
        const existingBuildingKinds = await getManifestsByKind(ctx, ['BuildingKind']);
        const pendingBuildingKinds = docs.map((doc) => doc.manifest).filter(({ kind }) => kind === 'BuildingKind');

        // build list of operations
        const opsets: OpSet[] = [];
        let opn = -1;

        // process item kinds first
        opn++;
        opsets[opn] = [];
        for (const doc of docs) {
            if (doc.manifest.kind != 'Item') {
                continue;
            }
            const actions = await itemKindDeploymentActions(ctx, doc, docs, ctx.verbose);
            opsets[opn].push({
                doc,
                actions,
                note: `registered item ${doc.manifest.spec.name}`,
            });
        }

        // process building kinds
        opn++;
        opsets[opn] = [];
        for (const doc of docs) {
            if (doc.manifest.kind != 'BuildingKind') {
                continue;
            }
            const actions = await buildingKindDeploymentActions(ctx, doc, docs, ctx.verbose);
            opsets[opn].push({
                doc,
                actions,
                note: `registered building ${doc.manifest.spec.name}`,
            });
        }

        // spawn building instances
        opn++;
        opsets[opn] = [];
        for (const doc of docs) {
            if (doc.manifest.kind != 'Building') {
                continue;
            }
            const spec = doc.manifest.spec;
            opsets[opn].push({
                doc,
                actions: [
                    {
                        name: 'DEV_SPAWN_BUILDING',
                        args: [
                            getBuildingKindIDByName(existingBuildingKinds, pendingBuildingKinds, spec.name),
                            ...spec.location,
                        ],
                    },
                ],
                note: `spawned building instance of ${spec.name} at ${spec.location.join(',')}`,
            });
        }

        // process quests
        opn++;
        opsets[opn] = [];
        for (const doc of docs) {
            if (doc.manifest.kind != 'Quest') {
                continue;
            }

            const actions = await questDeploymentActions(ctx, doc, docs, ctx.verbose);
            opsets[opn].push({
                doc,
                actions,
                note: `registered quest ${doc.manifest.spec.name}`,
            });
        }

        // spawn tile manifests (this is only valid while cheats are enabled)
        opn++;
        opsets[opn] = [];
        for (const doc of docs) {
            if (doc.manifest.kind != 'Tile') {
                continue;
            }
            const spec = doc.manifest.spec;
            opsets[opn].push({
                doc,
                actions: [
                    {
                        name: 'DEV_SPAWN_TILE',
                        args: spec.location,
                    },
                ],
                note: `spawned tile ${spec.location.join(',')}`,
            });
        }

        // abort here if dry-run
        if (ctx.dryRun) {
            console.error('The following actions will be performed:');
            console.error(
                opsets
                    .flatMap((op) =>
                        op.flatMap(({ actions }) =>
                            actions.map(
                                (op) => `    ${op.name}(${op.args.map((arg) => JSON.stringify(arg)).join(', ')})`
                            )
                        )
                    )
                    .join('\n')
            );
            console.error('');
            process.exit(0);
            return;
        }

        // authenticate player
        const player = await ctx.player();

        // apply the ops
        let results: OpResult[] = [];
        for (let i = 0; i < opsets.length; i++) {
            const pending = opsets[i].map((op) =>
                player
                    .dispatchAndWait(...op.actions)
                    .then(() => {
                        console.log(`✅ ${op.note}\n`);
                        return {
                            ok: true,
                            op,
                        };
                    })
                    .catch((err) => {
                        console.log(`❌ ${op.note}\n`);
                        return {
                            ok: false,
                            err,
                            op,
                        };
                    })
            );
            const res = await Promise.all(pending);
            results = [...results, ...res];
        }

        // report any failures
        const errs = results
            .filter((res) => !res.ok)
            .map(
                (res) =>
                    `file: ${res.op.doc.filename}\nerror:${res.err || 'unknown'}\nactions:${JSON.stringify(
                        res.op.actions
                    )}`
            );
        if (errs.length > 0) {
            console.error(`\n${errs.length} manifests failed to apply:\n\n${errs.join('\n\n')}`);
            process.exit(1);
        }

        // done!
        process.exit(0);
    },
};

export default deploy;
