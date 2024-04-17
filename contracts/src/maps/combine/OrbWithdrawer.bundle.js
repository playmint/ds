const DEPOSIT_SIG = `function DEPOSIT(address fromERC20Contract, uint256 toDownstreamItemId, uint256 amount)`;
const WITHDRAW_SIG = `function WITHDRAW(uint256 fromDownstreamItemId, address toERC20Contract, uint256 amount)`;

async function wrapper({TOKEN_NAME, TOKEN_ADDRESS, ITEM_ID, MODE}, { selected, world }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(
        (b) => selectedTile && b.location?.tile?.id === selectedTile.id,
    );
    selectedBuilding?.kind?.implementation?.addr;

    const amount = 1;

    const deposit = async () => {
        const payloadArgs = [
            TOKEN_ADDRESS,
            ITEM_ID,
            amount,
        ];
        console.log('payload', payloadArgs);
        const payload = ds.encodeCall(DEPOSIT_SIG, payloadArgs);
        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };

    const withdraw = async () => {
        const payloadArgs = [
            ITEM_ID,
            TOKEN_ADDRESS,
            amount,
        ];
        console.log('payload', payloadArgs);
        const payload = ds.encodeCall(WITHDRAW_SIG, payloadArgs);
        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };

    return {
        version: 1,
        components: [
            {
                id: "depositor",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        buttons: [
                            MODE == 'deposit' ? {
                                text: `Deposit ${TOKEN_NAME}`,
                                type: "action",
                                action: deposit,
                            } : {
                                text: `Withdraw ${TOKEN_NAME}`,
                                type: "action",
                                action: withdraw,
                            },
                        ],
                        html: `
                            <p>Token Drop Off</p>
                        `,
                    },
                ],
            },
        ],
    };
}

async function update(state, block) {
    const TOKEN_NAME = 'Orb';
    const TOKEN_ADDRESS = '0x11D61b38F8018CE2c18eDDDA0517a5c4011d43f1';
    const ITEM_ID = BigInt('0x6a7a67f0314bc8e500000001000000000000003200000032');
    return wrapper({ TOKEN_NAME, TOKEN_ADDRESS, ITEM_ID, MODE: 'withdraw' }, state);
}

export { update as default };
