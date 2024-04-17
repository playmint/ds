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

export { wrapper as w };
