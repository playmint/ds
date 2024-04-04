/** @format */

import { CompoundKeyEncoder, ItemSlotFragment, NodeSelectors, WorldStateFragment } from '@downstream/core';
import { AbiCoder, ethers } from 'ethers';
import { TransferSlot } from './inventory-provider';
import { getBagsAtEquipee } from '@downstream/core/src/utils';

export const resourceRegex = /^0x37f9b55d[0-9a-f]+$/g;

export function iconURL(icon?: string) {
    return icon ? `https://assets.downstream.game/icons/${icon}.svg` : '/icons/unknown.png';
}

export function getFullSlotID(slot: TransferSlot): string {
    return `${slot.id}-${slot.equipIndex}-${slot.slotKey}`;
}

export function getItemDetails(itemSlot: ItemSlotFragment) {
    const itemId = itemSlot.item.id;
    const name = itemSlot.item.name?.value || '';
    const icon = iconURL(itemSlot.item.icon?.value);
    const quantity = itemSlot.balance;

    return {
        itemId,
        name,
        icon,
        quantity,
    };
}

export function getBuildingId(z: number, q: number, r: number, s: number) {
    return CompoundKeyEncoder.encodeInt16(NodeSelectors.Building, z, q, r, s);
}

export function getBagId(buildingId: string) {
    const keccak256Hash = ethers.keccak256(AbiCoder.defaultAbiCoder().encode(['bytes24'], [buildingId]));
    const uint64Hash = BigInt(keccak256Hash) % BigInt(2 ** 64);
    return CompoundKeyEncoder.encodeUint160(NodeSelectors.Bag, uint64Hash);
}

export function getBuildingBag(world: WorldStateFragment | undefined, buildingId: string, equipIndex: number) {
    const building = world?.buildings?.find((b) => b.id === buildingId);
    const bags = building ? getBagsAtEquipee(world?.bags || [], building) : [];
    return bags.find((b) => b.key == equipIndex);
}
