/** @format */

import { BagFragment, ItemSlotFragment } from '@dawnseekers/core';
import { toUtf8String } from 'ethers';

export const resourceRegex = /^0x37f9b55d[0-9a-f]+$/g;

export const resourceIds = {
    wood: '0x37f9b55d0000000000000000000000000000000000000001',
    stone: '0x37f9b55d0000000000000000000000000000000000000002',
    iron: '0x37f9b55d0000000000000000000000000000000000000003'
};

export const resources = {
    '0x37f9b55d0000000000000000000000000000000000000001': 'Wood',
    '0x37f9b55d0000000000000000000000000000000000000002': 'Stone',
    '0x37f9b55d0000000000000000000000000000000000000003': 'Iron'
};

export const icons = {
    wood: '/icons/wood.png',
    stone: '/icons/stone.png',
    iron: '/icons/iron.png',
    hammer: '/icons/hammer.png',
    unknown: '/icons/unknown.png'
};

export const getItemName = (itemID: string): string => {
    const last15Bytes = itemID.slice(-30, -16);
    const asciiString = toUtf8String('0x' + last15Bytes);

    return asciiString;
};

export function isResource(slot: ItemSlotFragment) {
    return slot.item.kind === 'Resource';
}

export function getSlotName(slot: ItemSlotFragment) {
    return isResource(slot) ? resources[slot.item.id] : getItemName(slot.item.id);
}

export function getItemIcon(name: string) {
    return icons[name.toLowerCase()] || icons.unknown;
}

export function getItemDetails(itemSlot: ItemSlotFragment) {
    const itemId = itemSlot.item.id;
    const name = getSlotName(itemSlot);
    const icon = getItemIcon(name);
    const quantity = itemSlot.balance;

    return {
        itemId,
        itemKind: itemSlot.item.kind,
        name,
        icon,
        quantity
    };
}

/**
 * Get the nth next available slot key in the series.
 *
 * @param bag the bag we are getting the next slot for
 * @param skip the number of next slot keys to skip over
 */
export function getNewSlotKey(bag: BagFragment, skip: number): number {
    const keys = bag.slots.map((s) => s.key);
    let n = 0;
    for (let i = 0; i < 255; i += 1) {
        if (!keys.includes(i)) {
            if (n === skip) {
                return i;
            }
            n += 1;
        }
    }
    return -1;
}
