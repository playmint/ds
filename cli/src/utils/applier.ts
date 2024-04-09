import { CogAction, CompoundKeyEncoder, NodeSelectors } from '@downstream/core';
import { BuildingKindFragment, ItemFragment, TilesStateFragment, WorldStateFragment } from '@downstream/core/src/gql/graphql';
import { AbiCoder, id as keccak256UTF8, solidityPacked, fromTwos } from 'ethers';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import {
    ContractSource,
    ManifestDocument,
    Slot,
    FacingDirectionTypes,
} from '../utils/manifest';
import { encodeTileID, encodeItemID, encodeBagID, getItemIdByName, encodeBuildingKindID, getBuildingKindIDByName, getBuildingCategoryEnum } from './helpers';
import { isInBounds } from '../utils/bounds';

const null24bytes = '0x000000000000000000000000000000000000000000000000';
const temporaryZoneConstant = 0;

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
                return coder.encode(['int16', 'int16', 'int16', 'int16'], [temporaryZoneConstant, task.location[0], task.location[1], task.location[2]]);
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
    const [z, q, r, s] = spec.location ? [temporaryZoneConstant, spec.location[0], spec.location[1], spec.location[2]] : [temporaryZoneConstant, 0, 0, 0];

    ops.push({
        name: 'REGISTER_QUEST',
        args: [questId, spec.name, spec.description, !!spec.location, z, q, r, s, taskIds, nextQuestIds],
    });

    return ops;
};

export const getOpsForManifests = async (
    docs,
    world: WorldStateFragment,
    tiles: TilesStateFragment,
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
    const convertedBuildingCoords = world.buildings.map(building => 
        building.location?.tile.coords.map(coord => fromTwos(coord, 16))
    );
    let skippedBuildings = 0;
    opn++;
    opsets[opn] = [];
    for (const doc of docs) {
        if (doc.manifest.kind != 'Building') {
            continue;
        }
        const spec = doc.manifest.spec;
        const [q, r, s] = spec.location;
        const inBounds = isInBounds(q, r, s);

        let shouldSkip = false;
        for (let i = 0; i < convertedBuildingCoords.length; i++) {
            const coords = String(convertedBuildingCoords[i]).split(',').map(Number);
            if (coords[1] == q && coords[2] == r && coords[3] == s){
                shouldSkip = true;
                skippedBuildings++;
                break;
            }
        }

        if (shouldSkip){
            continue;
        }

        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_SPAWN_BUILDING',
                    args: [
                        getBuildingKindIDByName(existingBuildingKinds, pendingBuildingKinds, spec.name),
                        temporaryZoneConstant, spec.location[0], spec.location[1], spec.location[2],
                        FacingDirectionTypes.indexOf(spec.facingDirection),
                    ],
                },
            ],
            note: `spawned building instance of ${spec.name} at ${spec.location.join(',')}`,
            inBounds: inBounds,
        });
    }

    if (skippedBuildings > 0) {
        const skipReason = skippedBuildings === 1 ? 'building location because it already exists in the world' : 'building locations because they already exist in the world';
        console.log(`⏩ skipped ${skippedBuildings} ${skipReason}\n`);
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
    const convertedTileCoords = tiles.tiles.map(tile => 
        tile.coords.map(coord => fromTwos(coord, 16))
    );
    let skippedTiles = 0;
    opn++;
    opsets[opn] = [];
    for (const doc of docs) {
        if (doc.manifest.kind != 'Tile') {
            continue;
        }
        const spec = doc.manifest.spec;
        const [q, r, s] = spec.location;
        const inBounds = isInBounds(q, r, s);
        
        let shouldSkip = false;
        for (let i = 0; i < convertedTileCoords.length; i++) {
            if (convertedTileCoords[i][1] == q && convertedTileCoords[i][2] == r && convertedTileCoords[i][3] == s && tiles.tiles[i].biome != undefined){
                shouldSkip = true;
                skippedTiles++;
                break;
            }
        }

        if (shouldSkip){
            continue;
        }
        
        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_SPAWN_TILE',
                    args: [temporaryZoneConstant, spec.location[0], spec.location[1], spec.location[2]],
                },
            ],
            note: `spawned tile ${spec.location.join(',')}`,
            inBounds: inBounds,
        });
    }

    if (skippedTiles > 0) {
        const skipReason = skippedTiles === 1 ? 'tile because it already exists in the world' : 'tiles because they already exist in the world';
        console.log(`⏩ skipped ${skippedTiles} ${skipReason}\n`);
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
        const [z, q, r, s] =  [temporaryZoneConstant, spec.location[0], spec.location[1], spec.location[2]];
        const inBounds = isInBounds(q, r, s);

        const bagID = encodeBagID({ z, q, r, s });
        const ownerAddress = solidityPacked(['uint160'], [0]); // public
        const equipee = encodeTileID({ z, q, r, s });
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
            inBounds: inBounds,
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
    inBounds?: boolean;
};

export type OpSet = Op[];
