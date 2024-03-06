// CONVERTED FROM SOLIDITY, CODE WILL READ A BIT WEIRD

import { ethers } from 'ethers';

// const BLOCKS_PER_TICK = 1;
// const MAX_ENTITIES_PER_SIDE = 100;
export const MAX_TICKS = 300;

export const ATOM_LIFE = 0;
export const ATOM_DEFENSE = 1;
export const ATOM_ATTACK = 2;
export const COMBAT_JOIN_WINDOW_BLOCKS = 7;

export interface EntityState {
    entityID: ethers.BytesLike;
    stats: [number, number, number];
    damage: number;
    damageInflicted: number;
    isPresent: boolean;
    isDead: boolean;
    hasClaimed: boolean;
}

export enum CombatWinState {
    NONE,
    ATTACKERS,
    DEFENDERS,
    DRAW,
}
