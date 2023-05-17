/** @format */

import { CompoundKeyEncoder, ItemSlotFragment, NodeSelectors, WorldStateFragment } from '@dawnseekers/core';
import { AbiCoder, ethers } from 'ethers';

export const resourceRegex = /^0x37f9b55d[0-9a-f]+$/g;

export function iconURL(icon?: string) {
    return icon ? `https://playmintglobal.z16.web.core.windows.net/icons/${icon}.svg` : '/icons/unknown.png';
}

export function getItemDetails(itemSlot: ItemSlotFragment) {
    const itemId = itemSlot.item.id;
    const name = itemSlot.item.name?.value;
    const icon = iconURL(itemSlot.item.icon?.value);
    const quantity = itemSlot.balance;

    return {
        itemId,
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
