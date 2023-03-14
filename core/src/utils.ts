import { ethers } from 'ethers';
import { State } from './client';

export const getSelector = (name: string): string => {
    const selector = new ethers.Interface([`function ${name}()`]).getFunction(name)?.selector;
    if (!selector) {
        throw new Error(`failed to generate selector for ${name}`);
    }
    return selector;
};

export const NodeSelectors = {
    Tile: getSelector('Tile'),
    Seeker: getSelector('Seeker'),
};

export const CompoundKeyEncoder = {
    encodeInt16(nodeSelector: string, ...keys: [number, number, number, number]) {
        return ethers.concat([
            ethers.getBytes(nodeSelector),
            ethers.getBytes(ethers.toBeHex(BigInt(0), 12)),
            ethers.getBytes(ethers.toBeHex(ethers.toTwos(BigInt(keys[0]), 16), 2)),
            ethers.getBytes(ethers.toBeHex(ethers.toTwos(BigInt(keys[1]), 16), 2)),
            ethers.getBytes(ethers.toBeHex(ethers.toTwos(BigInt(keys[2]), 16), 2)),
            ethers.getBytes(ethers.toBeHex(ethers.toTwos(BigInt(keys[3]), 16), 2)),
        ]);
    },
    encodeUint160(nodeSelector: string, ...keys: [ethers.BigNumberish]) {
        return ethers.concat([ethers.getBytes(nodeSelector), ethers.getBytes(ethers.toBeHex(BigInt(keys[0]), 20))]);
    },
};

export function toDAG(prev: any, maxDepth: number, depth: number): any {
    return Object.keys(prev).reduce((o, k) => {
        const v = prev[k];
        if (Array.isArray(v)) {
            o[k] = v.map((vv) => (typeof vv == 'object' ? toDAG(vv, maxDepth, depth + 1) : vv));
        } else if (typeof v === 'object') {
            if (depth < maxDepth) {
                const vv = toDAG(v, maxDepth, depth + 1);
                if (vv === null) {
                    return o;
                }
                o[k] = vv;
            } else {
                o[k] = null; // end the cycle
            }
        } else {
            o[k] = v;
        }
        return o;
    }, {} as any);
}

export function stateToJSON(state: State) {
    return JSON.stringify(toDAG(state, 6, 0), (_key, value) => (typeof value === 'bigint' ? value.toString() : value));
}
