import { BagFragment, ConnectedPlayer } from '@app/../../core/src';
import { useWalletProvider } from '@app/hooks/use-wallet-provider';
import { Inventory } from '@app/plugins/inventory';
import { BasePanelStyles } from '@app/styles/base-panel.styles';
import { ActionButton } from '@app/styles/button.styles';
import { colorMap, colors } from '@app/styles/colors';
import { FunctionComponent, useCallback, useMemo } from 'react';
import styled, { css } from 'styled-components';

const StyledWalletItemsPanel = styled.div`
    width: 43.5rem;
    position: relative;
    overflow-y: auto;
    max-height: calc(100vh - 35rem);
    pointer-events: all;
`;

const WalletItemsActionButton = styled(ActionButton)`
    color: ${colors.green_0};
    background: ${colors.grey_5};

    &:hover {
        background: ${colors.green_0};
        color: ${colors.grey_5};
        opacity: 1;
    }

    &:active {
        background: ${colors.green_1};
        color: ${colors.grey_5};
    }
`;

const WalletItemsItemStyles = () => css`
    position: relative;
    padding: 0;
    overflow: hidden;
    margin-bottom: 0.5rem;

    cursor: default;

    h3 {
        margin: 0;
    }

    .header {
        background: ${colorMap.secondaryBackground};
        padding: var(--panel-padding);

        p {
            font-size: 1.3rem;
            color: ${colors.grey_3};
        }
    }

    /* Progress bar */

    .progress {
        width: 100%;
        display: flex;
        flex-direction: row;
        margin-top: 0.5rem;

        .progressText {
            margin-left: 1.5rem;
            font-weight: 700;
            font-size: 1.2rem;
        }

        .progressBar {
            flex-grow: 1;
        }
    }

    /* Tasks */

    .taskContainer {
        font-size: 1.4rem;
        padding: var(--panel-padding) var(--panel-padding) 0 var(--panel-padding);
    }

    .buttonContainer {
        margin: var(--panel-padding) 0;
        display: flex;
        justify-content: center;
    }

    .buttonContainer .completeWalletItemsButton {
        width: 30rem;
    }
`;

const StyledWalletItemsItem = styled.div`
    ${BasePanelStyles}
    ${WalletItemsItemStyles}
`;

export const WalletItemsItem: FunctionComponent<{
    blockNumber: number;
    player: ConnectedPlayer;
    tokenAddress: string;
}> = ({ player, blockNumber, tokenAddress }) => {
    const { provider } = useWalletProvider();
    const tokens = useMemo(
        () =>
            blockNumber > 0
                ? player.tokens.sort((a, b) => {
                      return (a.token.info?.item.id || '') < (b.token.info?.item.id || '') ? -1 : 1;
                  })
                : [],
        [player.tokens, blockNumber]
    );

    const psudoBags: BagFragment[] = useMemo(
        () =>
            tokens.reduce((bags, { token }, idx) => {
                if (!token || !token.info || token.info.balance < 1) {
                    return bags;
                }
                let bag: BagFragment;
                if (bags.length === 0 || idx % 6 === 0) {
                    bag = {
                        id: `0xplayerwallet${idx}`,
                        key: `0xplayerwallet${idx}`,
                        slots: [],
                        owner: {
                            id: player.id,
                        },
                        equipee: {
                            key: idx,
                            node: {
                                id: '0xplayer',
                            },
                        },
                    };
                    bags.push(bag);
                } else {
                    bag = bags[bags.length - 1];
                }
                bag.slots.push({
                    key: bag.slots.length,
                    balance: token.info.balance,
                    item: token.info.item,
                });
                return bags;
            }, [] as BagFragment[]),
        [tokens, player.id]
    );

    // always keep an extra empty bag row so that there
    // is always somewhere to drop stuff
    const psudoBagsPlusOne = useMemo(
        () => [
            ...psudoBags,
            {
                id: `0xplayerwalletlast`,
                key: `0xplayerwalletlast`,
                slots: [],
                owner: {
                    id: player.id,
                },
                equipee: {
                    key: 99999,
                    node: {
                        id: '0xplayer',
                    },
                },
            },
        ],
        [psudoBags, player.id]
    );

    const addTokensMetamask = useCallback(() => {
        if (!provider) {
            return;
        }
        if (!player || player.tokens.length == 0) {
            return;
        }
        const args = player.tokens.reduce((args, { token }) => {
            if (!token.info) {
                return args;
            }
            args.push({
                method: 'wallet_watchAsset',
                params: {
                    type: 'ERC1155',
                    options: {
                        address: tokenAddress,
                        tokenId: BigInt(token.info.item.id).toString(),
                    },
                },
            });
            return args;
        }, [] as any[]);
        console.debug('sending to metamask', args);
        const p = provider.provider as any;
        if (p.sendAsync) {
            p.sendAsync(args);
        } else if (p.sendCustomRequest) {
            p.sendCustomRequest(args);
        } else {
            console.warn('provider does not support sendAsync or sendCustomRequest');
        }
    }, [player, provider, tokenAddress]);

    return (
        <StyledWalletItemsItem>
            <div className="header">
                <h3>Wallet Storage</h3>
                <p>Items stored with your player wallet</p>
            </div>

            <div className="taskContainer">
                <Inventory
                    bags={psudoBagsPlusOne}
                    ownerId={`WALLET${player.addr}`}
                    isInteractable={true}
                    numBagSlots={6}
                />
            </div>
            <div className="buttonContainer">
                {provider && provider.method === 'metamask' && (
                    <WalletItemsActionButton onClick={addTokensMetamask} className="completeWalletItemsButton">
                        Add Tokens To Metamask
                    </WalletItemsActionButton>
                )}
            </div>
        </StyledWalletItemsItem>
    );
};

export interface WalletItemsPanelProps {
    player: ConnectedPlayer;
    tokenAddress: string;
    blockNumber: number;
}

export const WalletItemsPanel: FunctionComponent<WalletItemsPanelProps> = ({
    player,
    blockNumber,
    tokenAddress,
}: WalletItemsPanelProps) => {
    return (
        <StyledWalletItemsPanel className="no-scrollbars">
            <WalletItemsItem player={player} blockNumber={blockNumber} tokenAddress={tokenAddress} />
        </StyledWalletItemsPanel>
    );
};
