/** @format */

import { ethers } from 'ethers';

interface MaybeNamed {
    id: string;
    name?: {
        value?: string | null;
    } | null;
}

export const formatShortId = (id: string) => {
    return id.slice(-4);
};

export const formatNameOrId = (node?: MaybeNamed, idPrefix: string = ''): string => {
    if (!node) {
        return '';
    }
    if (node.name?.value) {
        return node.name.value;
    } else {
        return `${idPrefix}${formatShortId(node.id)}`;
    }
};

export const decodeString = (value: string): string => {
    if (!value || value.length === 0 || !value.startsWith('0x')) {
        return '';
    }
    if (!value.endsWith('00')) {
        value += '00';
    }
    try {
        return ethers.decodeBytes32String(value);
    } catch (error) {
        console.error('failed to decode string:', error);
        return 'invalid string';
    }
};

const ensCache: { [address: string]: string | null } = {};
let ensActiveChecks = 0;

export async function lookupENSName(address: string): Promise<string | null> {
    // Check if the address is already in the ensCache
    if (ensCache.hasOwnProperty(address)) {
        return ensCache[address];
    }

    // Lookup max 5 addresses at a time
    if (ensActiveChecks >= 5) {
        return null;
    }

    const ensProvider = ethers.getDefaultProvider('mainnet');
    try {
        ensActiveChecks++;
        ensCache[address] = null;
        const name = await ensProvider.lookupAddress(address);
        // Cache the result, even if it's null
        ensCache[address] = name;
        return name;
    } catch (error) {
        console.error('ENS lookup failed', error);
        ensCache[address] = null;
        return null;
    } finally {
        ensActiveChecks--;
    }
}

export const getItemStructure = (itemId: string) => {
    return [...itemId]
        .slice(2)
        .reduce((bs, b, idx) => {
            if (idx % 8 === 0) {
                bs.push('0x');
            }
            bs[bs.length - 1] += b;
            return bs;
        }, [] as string[])
        .map((n: string) => Number(BigInt(n)))
        .slice(-4);
};

// these hues map each goo color to a starting point on the hue wheel
const HUE_BLUE = 0.55;
const HUE_GREEN = 0.3;
const HUE_RED = 0.92;

// insecure little string=>number hash
export const hashCode = (str: string): number => {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        const chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0;
    }
    return hash;
};

export const getItemColorCSS = (itemId: string): string => {
    const [_stackable, greenGoo, blueGoo, redGoo] = getItemStructure(itemId);
    const goo = [
        { hue: HUE_RED, value: redGoo, hash: hashCode(`${itemId}-red`) },
        { hue: HUE_GREEN, value: greenGoo, hash: hashCode(`${itemId}-green`) },
        { hue: HUE_BLUE, value: blueGoo, hash: hashCode(`${itemId}-blue`) },
    ]
        .sort((a, b) => {
            if (a.value === b.value) {
                return a.hash - b.hash;
            }
            return a.value - b.value;
        })
        .reverse();

    // calculate the hue of the item
    // take goo0's hue
    // shift the hue to the left by the difference betwee goo0 and goo1
    // shift the hue to the right by the difference betwee goo1 and goo2
    const shiftLeft = goo[0].value > 0 ? (1 - (goo[0].value - goo[1].value) / goo[0].value) * 0.2 : 0;
    const shiftRight = goo[1].value > 0 ? (1 - (goo[1].value - goo[2].value) / goo[1].value) * 0.2 : 0;
    const hue = goo[0].hue - shiftLeft + shiftRight;

    // calculuate the lightness in range 50 - 100
    // where 50 is a bright saturated color and 100 is pure white
    // a item mostly made of a single goo ==> closer to a bright color
    // a item evenly mixed of all goos ==> closer to white
    const pureness1 = 1 - goo[1].value / goo[0].value;
    const pureness2 = 1 - goo[2].value / goo[0].value;
    const lightness = 100 - 10 * pureness1 - 40 * pureness2;

    return `hsl(${hue}turn 90% ${lightness}%)`;
};
