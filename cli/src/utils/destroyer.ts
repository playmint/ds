import { CogAction, } from '@downstream/core';
import { WorldStateFragment, TilesStateFragment } from '@downstream/core/src/gql/graphql';
import { id as keccak256UTF8, solidityPacked, fromTwos } from 'ethers';
import { z } from 'zod';
import { ManifestDocument, Slot } from '../utils/manifest';
import { encodeTileID, encodeBagID, getItemIdByName } from './helpers';
import { isInBounds } from '../utils/bounds';
import { ZoneStateFragment, GlobalStateFragment } from '@downstream/core';

export const getOpsForManifests = async (
    docs,
    zone: ZoneStateFragment,
    global: GlobalStateFragment
): Promise<OpSet[]> => {
    const zoneId = Number(BigInt.asIntN(16, zone.key));
    // build list of operations
    const opsets: OpSet[] = [];
    let opn = -1;

    // destroy building instances
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

        let shouldSkip = true;
        for (let i = 0; i < convertedBuildingCoords.length; i++) {
            const coords = String(convertedBuildingCoords[i]).split(',').map(Number);
            if (coords[1] == q && coords[2] == r && coords[3] == s){
                shouldSkip = false;
                break;
            }
        }

        if (shouldSkip){
            skippedBuildings++;
            continue;
        }
        
        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_DESTROY_BUILDING',
                    args: [...[zoneId, spec.location[0], spec.location[1], spec.location[2]]],
                },
            ],
            note: `destroyed building instance of ${spec.name} at ${spec.location.join(',')}`,
            inBounds: inBounds,
        });
    }

    if (skippedBuildings > 0) {
        const skipReason = skippedBuildings === 1 ? 'building location because it doesn\'t exist in the world' : 'building locations because they don\'t exist in the world';
        console.log(`⏩ skipped ${skippedBuildings} ${skipReason}\n`);
    }

    // destroy tile manifests (this is only valid while cheats are enabled)
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

        let shouldSkip = true;
        for (let i = 0; i < convertedTileCoords.length; i++) {
            if (convertedTileCoords[i][1] == q && convertedTileCoords[i][2] == r && convertedTileCoords[i][3] == s && tiles.tiles[i].biome != undefined){
                shouldSkip = false;
                break;
            }
        }

        if (shouldSkip){
            skippedTiles++;
            continue;
        }

        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_DESTROY_TILE',
                    args: [zoneId, spec.location[0], spec.location[1], spec.location[2]],
                },
            ],
            note: `destroyed tile ${spec.location.join(',')}`,
            inBounds: inBounds,
        });
    }

    if (skippedTiles > 0) {
        const skipReason = skippedTiles === 1 ? 'tile because it doesn\'t exist in the world' : 'tiles because they don\'t exist in the world';
        console.log(`⏩ skipped ${skippedTiles} ${skipReason}\n`);
    }

    // destory bag manifests (this is only valid while cheats are enabled)
    opn++;
    opsets[opn] = [];
    for (const doc of docs) {
        if (doc.manifest.kind != 'Bag') {
            continue;
        }

        const encodeSlotConfig = (slots: ReturnType<typeof Slot.parse>[]) => {
            const items = [0, 0, 0, 0].map((_, idx) =>
                slots[idx]
                    ? getItemIdByName(docs, global.items, slots[idx].name)
                    : '0x000000000000000000000000000000000000000000000000'
            );
            const quantities = [0, 0, 0, 0].map((_, idx) => (slots[idx] ? slots[idx].quantity : 0));
            return { items, quantities };
        };

        const spec = doc.manifest.spec;
        const [z, q, r, s] = [zoneId, spec.location[0], spec.location[1], spec.location[2]];
        const inBounds = isInBounds(q, r, s);

        const bagID = encodeBagID({ z, q, r, s });
        const ownerAddress = solidityPacked(['uint160'], [0]); // public
        const equipee = encodeTileID({ z, q, r, s });
        const equipSlot = 0;

        const bagContents = encodeSlotConfig(spec.items || []);
        const slotContents = bagContents.items;

        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_DESTROY_BAG',
                    args: [bagID, ownerAddress, equipee, equipSlot, slotContents],
                },
            ],
            note: `destroyed bag ${spec.location.join(',')}`,
            inBounds: inBounds,
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
