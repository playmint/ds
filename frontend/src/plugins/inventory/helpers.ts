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
    const icon = itemSlot.item.icon ? iconURL(itemSlot.item.icon.value) : iconURL(getUnknownItemIcon(itemSlot.item));
    const quantity = itemSlot.balance;

    return {
        itemId,
        name,
        icon,
        quantity,
    };
}

const ITEM_ICONS = [
    'xx-01',
    '31-19',
    '32-69',
    '32-23',
    '31-92',
    '31-5',
    '31-270',
    '18-161',
    '31-16',
    '30-82',
    '11-248',
    '21-206',
    '17-111',
    '30-182',
    '19-35',
    '30-115',
    '18-82',
    '28-111',
    '28-101',
    '26-66',
    '19-178',
    '26-189',
    '17-72',
    '24-209',
    '24-129',
    '22-204',
    '22-170',
    '22-136',
    '22-115',
    '14-183',
    '09-213',
];

export function getBuildingId(q: number, r: number, s: number) {
    return CompoundKeyEncoder.encodeInt16(NodeSelectors.Building, 0, q, r, s);
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
function getUnknownItemIcon(item: {
    __typename?: 'Node' | undefined;
    id: string;
    name?: { __typename?: 'Annotation' | undefined; id: string; value: string } | null | undefined;
    icon?: { __typename?: 'Annotation' | undefined; id: string; value: string } | null | undefined;
}): string | undefined {
    const keccak256Hash = ethers.keccak256(AbiCoder.defaultAbiCoder().encode(['bytes24'], [item.id]));
    const iconIndex = BigInt(keccak256Hash) % BigInt(ITEM_ICONS.length);
    return ITEM_ICONS[Number(iconIndex)];
}
