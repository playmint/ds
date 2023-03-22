/** @format */

import { ItemSlotFragment } from '@dawnseekers/core';
import { toUtf8String } from 'ethers';

export const resourceRegex = /^0x37f9b55d[0-9a-f]+$/g;

export const resources = {
    '0x37f9b55d0000000000000000000000000000000000000001': 'Wood',
    '0x37f9b55d0000000000000000000000000000000000000002': 'Stone',
    '0x37f9b55d0000000000000000000000000000000000000003': 'Iron'
};

export const icons = {
    wood: '/icons/wood.png',
    stone: '/icons/stone.png',
    iron: '/icons/iron.png',
    hammer: '/icons/hammer.png'
};

export const getItemName = (itemID: string): string => {
    const last15Bytes = itemID.slice(-30, -16);
    const asciiString = toUtf8String('0x' + last15Bytes);

    return asciiString;
};

export function isResource(id: string) {
    return id.match(resourceRegex);
}

export function getSlotName(slot: ItemSlotFragment) {
    return isResource(slot.item.id) ? resources[slot.item.id] : getItemName(slot.item.id);
}

export function getItemIcon(name: string) {
    return icons[name.toLowerCase()];
}

export function getItemDetails(itemSlot: ItemSlotFragment) {
    const itemId = itemSlot.item.id;
    const name = getSlotName(itemSlot);
    const icon = getItemIcon(name);
    const quantity = itemSlot.balance;

    return {
        itemId,
        name,
        icon,
        quantity
    };
}
