import { wrapper } from './genericwrapper';

export default async function update(state, block) {
    const TOKEN_NAME = 'Orb';
    const TOKEN_ADDRESS = '0x11D61b38F8018CE2c18eDDDA0517a5c4011d43f1';
    const ITEM_ID = BigInt('0x6a7a67f0314bc8e500000001000000000000003200000032');
    return wrapper({ TOKEN_NAME, TOKEN_ADDRESS, ITEM_ID, MODE: 'withdraw' }, state, block);
}
