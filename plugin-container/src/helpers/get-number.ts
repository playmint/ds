/** @format */

import { BigNumberish } from 'ethers';

export function getNumber(value: BigNumberish): number {
    switch (typeof value) {
        case 'string':
            return parseInt(value);

        case 'object':
            return parseInt(value.toString() || '');

        case 'bigint':
            return Number(value);

        case 'number':
        default:
            return value;
    }
}
