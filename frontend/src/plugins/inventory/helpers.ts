/** @format */

import { CompoundKeyEncoder, ItemSlotFragment, NodeSelectors, WorldStateFragment } from '@dawnseekers/core';
import { AbiCoder, ethers, toUtf8String } from 'ethers';

export const resourceRegex = /^0x37f9b55d[0-9a-f]+$/g;

export const resourceIds = {
    unknown: '0x37f9b55d0000000000000000000000000000000000000000',
    wood: '0x37f9b55d0000000000000000000000000000000000000001',
    stone: '0x37f9b55d0000000000000000000000000000000000000002',
    iron: '0x37f9b55d0000000000000000000000000000000000000003'
};

export const resources = {
    '0x37f9b55d0000000000000000000000000000000000000000': 'Unknown',
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

export function getBuildingId(q: number, r: number, s: number) {
    return CompoundKeyEncoder.encodeInt16(NodeSelectors.Building, 0, q, r, s);
}

export function getBagId(buildingId: string) {
    const keccak256Hash = ethers.keccak256(AbiCoder.defaultAbiCoder().encode(['bytes24'], [buildingId]));
    const uint64Hash = BigInt(keccak256Hash) % BigInt(2 ** 64);
    return CompoundKeyEncoder.encodeUint160(NodeSelectors.Bag, uint64Hash);
}

export function getBuildingEquipSlot(world: WorldStateFragment | undefined, buildingId: string, equipIndex: number) {
    const building = world?.buildings?.find((b) => b.id === buildingId);
    return building && building.bags.length > 0 ? building.bags[equipIndex] : undefined;
}
