import { CogAction, } from '@downstream/core';
import { WorldStateFragment } from '@downstream/core/src/gql/graphql';
import { id as keccak256UTF8, solidityPacked } from 'ethers';
import { z } from 'zod';
import {
    ManifestDocument,
    Slot,
} from '../utils/manifest';
import { encodeTileID, encodeBagID, getItemIdByName } from './helpers';
import { isInBounds } from '../utils/bounds';

export const getOpsForManifests = async (
    docs,
    world: WorldStateFragment,
): Promise<OpSet[]> => {
    // build list of operations
    const opsets: OpSet[] = [];
    let opn = -1;

    // destroy building instances
    opn++;
    opsets[opn] = [];
    for (const doc of docs) {
        if (doc.manifest.kind != 'Building') {
            continue;
        }
        const spec = doc.manifest.spec;
        const [q, r, s] = spec.location;
        const inBounds = isInBounds(q, r, s);
        
        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_DESTROY_BUILDING',
                    args: [
                        ...spec.location,
                    ],
                },
            ],
            note: `destroyed building instance of ${spec.name} at ${spec.location.join(',')}`,
            inBounds: inBounds,
        });
    }

    // destroy tile manifests (this is only valid while cheats are enabled)
    opn++;
    opsets[opn] = [];
    for (const doc of docs) {
        if (doc.manifest.kind != 'Tile') {
            continue;
        }
        const spec = doc.manifest.spec;
        const [q, r, s] = spec.location;
        const inBounds = isInBounds(q, r, s);

        opsets[opn].push({
            doc,
            actions: [
                {
                    name: 'DEV_DESTROY_TILE',
                    args: spec.location,
                },
            ],
            note: `destroyed tile ${spec.location.join(',')}`,
            inBounds: inBounds,
        });
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
                    ? getItemIdByName(docs, world.items, slots[idx].name)
                    : '0x000000000000000000000000000000000000000000000000'
            );
            const quantities = [0, 0, 0, 0].map((_, idx) => (slots[idx] ? slots[idx].quantity : 0));
            return { items, quantities };
        };

        const spec = doc.manifest.spec;
        const [q, r, s] = spec.location;
        const inBounds = isInBounds(q, r, s);

        const bagID = encodeBagID({ q, r, s });
        const ownerAddress = solidityPacked(['uint160'], [0]); // public
        const equipee = encodeTileID({ q, r, s });
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