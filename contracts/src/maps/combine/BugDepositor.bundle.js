const DEPOSIT_SIG = `function DEPOSIT(address fromERC20Contract, uint256 toDownstreamItemId, uint256 amount)`;

async function wrapper({TOKEN_NAME, TOKEN_ADDRESS, ITEM_ID}, { selected, world }) {
    const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(
        (b) => selectedTile && b.location?.tile?.id === selectedTile.id,
    );
    selectedBuilding?.kind?.implementation?.addr;

    const amount = 1;

    const deposit = async () => {
        // await ds.approveERC20(TOKEN_ADDRESS, buildingKindAddr, amount);
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
                            {
                                text: `Deposit ${TOKEN_NAME}`,
                                type: "action",
                                action: deposit,
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
    const TOKEN_NAME = 'Bugs';
    const TOKEN_ADDRESS = '0xB58a3E142c1845a9B990aee53D7429A2FD717d87';
    const ITEM_ID = BigInt('0x6a7a67f0403b4e570000000100000064000000640000004c');
    return wrapper({ TOKEN_NAME, TOKEN_ADDRESS, ITEM_ID }, state);
}

export { update as default };
