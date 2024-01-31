import { ethers } from 'ethers';

export const getSelector = (name: string): string => {
    const fn = new ethers.Interface([`function ${name}()`]).getFunction(name);
    if (!fn) {
        throw new Error(`failed to generate selector for ${name}`);
    }
    if (!fn.selector) {
        throw new Error(`failed to generate selector for ${fn}`);
    }
    return fn.selector;
};

export const NodeSelectors = {
    Tile: getSelector('Tile'),
    Item: getSelector('Item'),
    MobileUnit: getSelector('MobileUnit'),
    Player: getSelector('Player'),
    Building: getSelector('Building'),
    BuildingKind: getSelector('BuildingKind'),
    ClientPlugin: getSelector('ClientPlugin'),
    Bag: getSelector('Bag'),
    Quest: getSelector('Quest'),
    Task: getSelector('Task'),
    PartKind: getSelector('PartKind'),
    PartActionDef: getSelector('PartActionDef'),
    Part: getSelector('Part'),
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
    encodeAddress(nodeSelector: string, addr: string) {
        return ethers.concat([ethers.getBytes(nodeSelector), ethers.getBytes(ethers.getAddress(addr))]);
    },
};
