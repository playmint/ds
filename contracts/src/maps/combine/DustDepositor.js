import { wrapper } from './genericwrapper';

export default async function update(state, block) {
    const TOKEN_NAME = 'Dust';
    const TOKEN_ADDRESS = '0x30f696759c71059449805C143389f51774475b1D';
    const ITEM_ID = BigInt('0x6a7a67f04465089500000001000000000000006400000000')
    return wrapper({ TOKEN_NAME, TOKEN_ADDRESS, ITEM_ID, MODE: 'deposit' }, state, block);
}
