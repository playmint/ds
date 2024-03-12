import { CogAction, CompoundKeyEncoder, NodeSelectors } from '@downstream/core';
import { BuildingKindFragment, ItemFragment, WorldStateFragment } from '@downstream/core/src/gql/graphql';
import { AbiCoder, id as keccak256UTF8, solidityPacked } from 'ethers';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
    BuildingCategoryEnum,
    BuildingCategoryEnumVals,
    ContractSource,
    ManifestDocument,
    Slot,
    FacingDirectionTypes,
} from '../utils/manifest';

const null24bytes = '0x000000000000000000000000000000000000000000000000';

export const encodeTileID = ({ q, r, s }: { q: number; r: number; s: number }) => {
    return solidityPacked(
        ['bytes4', 'uint96', 'int16', 'int16', 'int16', 'int16'],
        [NodeSelectors.Tile, 0, 0, q, r, s]
    );
};

export const encodeBagID = ({ q, r, s }: { q: number; r: number; s: number }) => {
    return solidityPacked(['bytes4', 'uint96', 'int16', 'int16', 'int16', 'int16'], [NodeSelectors.Bag, 0, 0, q, r, s]);
};

export const encodeItemID = ({
    name,
    stackable,
    goo,
}: {
    name: string;
    stackable: boolean;
    goo: { red: number; green: number; blue: number };
}) => {
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

const getQuestKey = (name: string) => {
    return BigInt.asUintN(64, BigInt(keccak256UTF8(`quest/${name}`)));
};

const encodeQuestID = ({ name }) => {
    return solidityPacked(['bytes4', 'uint32', 'uint64', 'uint64'], [NodeSelectors.Quest, 0, 0, getQuestKey(name)]);
};

// TODO: Is there a way of referencing the Solidity enum?
const getBuildingCategoryEnum = (category: BuildingCategoryEnum): number => {
    return BuildingCategoryEnumVals.indexOf(category);
};

const itemKindDeploymentActions = async (
    file: ReturnType<typeof ManifestDocument.parse>,
    compiler: (source: z.infer<typeof ContractSource>, manifestDir: string) => Promise<string>
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
        const alwaysActive = false;
        ops.push({
            name: 'REGISTER_KIND_PLUGIN',
            args: [pluginID, id, spec.name, js, alwaysActive],
        });
    }

    if (spec.contract && (spec.contract.file || spec.contract.bytecode)) {
        const bytecode = spec.contract.bytecode ? spec.contract.bytecode : await compiler(spec.contract, manifestDir);
        ops.push({
            name: 'DEPLOY_KIND_IMPLEMENTATION',
            args: [id, `0x${bytecode}`],
        });
    }

    return ops;
};

const getItemIdByName = (files, existingItems: ItemFragment[], name: string): string => {
    const foundItems = existingItems.filter((item) => item.name?.value === name);
    if (foundItems.length === 1) {
        const item = foundItems[0];
        if (!item.id) {
            throw new Error(`missing item.id field for Item ${name}`);
        }
        return item.id;
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
    file: ReturnType<typeof ManifestDocument.parse>,
    files: ReturnType<typeof ManifestDocument.parse>[],
    existingItems: ItemFragment[],
    compiler: (source: z.infer<typeof ContractSource>, manifestDir: string) => Promise<string>
): Promise<CogAction[]> => {
    const ops: CogAction[] = [];
    const manifestDir = path.dirname(file.filename);

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
    let inputItems: string[] = [null24bytes, null24bytes, null24bytes, null24bytes];
    let inputQtys: number[] = [0, 0, 0, 0];
    let outputItems: string[] = [null24bytes];
    let outputQtys: number[] = [0];

    let model = spec.model;

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

    if (spec.category == 'factory' || spec.category == 'custom' || spec.category == 'display') {
        model = `${model}-${spec.color || 0}`;
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
            model,
            materialItems,
            materialQtys,
            inputItems,
            inputQtys,
            outputItems,
            outputQtys,
        ],
    });

    // compile and deploy an implementation if given
    if (spec.category != 'billboard' && spec.category != 'blocker' && spec.contract && (spec.contract.file || spec.contract.bytecode)) {
        const bytecode = spec.contract.bytecode ? spec.contract.bytecode : await compiler(spec.contract, manifestDir);
        ops.push({
            name: 'DEPLOY_KIND_IMPLEMENTATION',
            args: [id, `0x${bytecode}`],
        });
    }

    // deploy client plugin if given
    if (spec.category != 'blocker' && spec.plugin && (spec.plugin.file || spec.plugin.inline)) {
        const pluginID = encodePluginID(spec); // use building name for plugin id
        const js = spec.plugin.file
            ? (() => {
                  const relativeFilename = path.join(manifestDir, spec.plugin.file);
                  if (!fs.existsSync(relativeFilename)) {
                      throw new Error(`plugin source not found: ${spec.plugin.file}`);
                  }
                  return fs.readFileSync(relativeFilename, 'utf8').toString();
              })()
            : spec.plugin.inline;
        ops.push({
            name: 'REGISTER_KIND_PLUGIN',
            args: [pluginID, id, spec.name, js, !!spec.plugin.alwaysActive],
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
    file: ReturnType<typeof ManifestDocument.parse>,
    files: ReturnType<typeof ManifestDocument.parse>[],
    existingItemKinds: ItemFragment[],
    existingBuildingKinds: BuildingKindFragment[]
): Promise<CogAction[]> => {
    const ops: CogAction[] = [];

    if (file.manifest.kind != 'Quest') {
        throw new Error(`expected quest kind spec`);
    }
    const spec = file.manifest.spec;

    const pendingBuildingKinds = files.map((doc) => doc.manifest).filter(({ kind }) => kind === 'BuildingKind');

    const encodeTaskData = (task: (typeof spec.tasks)[0]) => {
        const coder = AbiCoder.defaultAbiCoder();

        switch (task.kind) {
            case 'coord': {
                return coder.encode(['int16', 'int16', 'int16'], [...task.location]);
            }
            case 'inventory': {
                const item = getItemIdByName(files, existingItemKinds, task.item.name);
                return coder.encode(['bytes24', 'uint64'], [item, task.item.quantity]);
            }
            case 'message': {
                const buildingKindId = getBuildingKindIDByName(
                    existingBuildingKinds,
                    pendingBuildingKinds,
                    task.buildingKind
                );
                return coder.encode(['bytes24', 'string'], [buildingKindId, task.message]);
            }
            case 'questAccept':
            case 'questComplete': {
                return coder.encode(['bytes24'], [encodeQuestID({ name: task.quest })]);
            }
            case 'combat': {
                const combatState = task.combatState == 'winAttack' ? 0 : 1;
                return coder.encode(['uint8'], [combatState]);
            }
            case 'construct': {
                const buildingKindId = task.buildingKind
                    ? getBuildingKindIDByName(existingBuildingKinds, pendingBuildingKinds, task.buildingKind)
                    : null24bytes;
                return coder.encode(['bytes24'], [buildingKindId]);
            }
            case 'unitStats': {
                return coder.encode(['uint64', 'uint64', 'uint64'], [task.life, task.defence, task.attack]);
            }
            case 'deployBuilding': {
                const craftOutputID = task.craftOutput
                    ? getItemIdByName(files, existingItemKinds, task.craftOutput)
                    : null24bytes;
                const craftInputID = task.craftInput
                    ? getItemIdByName(files, existingItemKinds, task.craftInput)
                    : null24bytes;
                return coder.encode(['bytes24', 'bytes24'], [craftInputID, craftOutputID]);
            }
        }

        return solidityPacked(['uint8'], [0]);
    };

    // register tasks
    // const questKey = getQuestKey(spec.name); // TODO: Add questKey to taskID so tasks do not require a unique name globally
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
    const nextQuestIds = spec.next?.map((questName) => encodeQuestID({ name: questName })) || [];
    const [q, r, s] = spec.location ? spec.location : [0, 0, 0];

    ops.push({
        name: 'REGISTER_QUEST',
        args: [questId, spec.name, spec.description, !!spec.location, q, r, s, taskIds, nextQuestIds],
    });

    return ops;
};

const getBuildingKindIDByName = (existingBuildingKinds, pendingBuildingKinds, name: string) => {
    const foundBuildingKinds = existingBuildingKinds.filter((buildingKind) => buildingKind.name?.value === name);
    if (foundBuildingKinds.length === 1) {
        const buildingKind = foundBuildingKinds[0];
        if (!buildingKind.id) {
            throw new Error(`missing status.id field for BuildingKind ${name}`);
        }
        return buildingKind.id;
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

export const getOpsForManifests = async (
    docs,
    world: WorldStateFragment,
    existingBuildingKinds: BuildingKindFragment[],
    compiler: (source: z.infer<typeof ContractSource>, manifestDir: string) => Promise<string>
): Promise<OpSet[]> => {
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
        const actions = await itemKindDeploymentActions(doc, compiler);
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
        const actions = await buildingKindDeploymentActions(doc, docs, world.items, compiler);
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
                        FacingDirectionTypes.indexOf(spec.facingDirection),
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

        const actions = await questDeploymentActions(doc, docs, world.items, existingBuildingKinds);
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

    // spawn bag manifests (this is only valid while cheats are enabled)
    opn++;
    opsets[opn] = [];
    for (const doc of docs) {
        if (doc.manifest.kind != 'Bag') {
            continue;
        }

        const encodeSlotConfig = (slots: ReturnType<typeof Slot.parse>[]) => {
            const items = [0, 0, 0, 0].map((_, idx) =>
                slots[idx]
                    ? getItemIdByName(docs, world.items, slots[idx].name)
                    : '0x000000000000000000000000000000000000000000000000'
            );
            const quantities = [0, 0, 0, 0].map((_, idx) => (slots[idx] ? slots[idx].quantity : 0));
            return { items, quantities };
        };

        const spec = doc.manifest.spec;
        const [q, r, s] = spec.location;

        const bagID = encodeBagID({ q, r, s });
        const ownerAddress = solidityPacked(['uint160'], [0]); // public
        const equipee = encodeTileID({ q, r, s });
        const equipSlot = 0;

        const bagContents = encodeSlotConfig(spec.items || []);
        const slotContents = bagContents.items;
        const slotBalances = bagContents.quantities;

        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_SPAWN_BAG',
                    args: [bagID, ownerAddress, equipee, equipSlot, slotContents, slotBalances],
                },
            ],
            note: `spawned bag ${spec.location.join(',')}`,
        });
    }

    // add AutoQuests
    opn++;
    opsets[opn] = [];
    for (const doc of docs) {
        if (doc.manifest.kind != 'AutoQuest') {
            continue;
        }
        const spec = doc.manifest.spec;
        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'AUTO_QUEST',
                    args: [spec.name, spec.index],
                },
            ],
            note: `added auto-quest ${spec.name}`,
        });
    }

    return opsets;
};

export type Op = {
    doc: z.infer<typeof ManifestDocument>;
    actions: CogAction[];
    note: string;
};

export type OpSet = Op[];
