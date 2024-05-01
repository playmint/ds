import { useConfig } from '@app/hooks/use-config';
import { GameStateProvider, useBlock, useCogClient, useGlobal, usePlayer, useWallet } from '@app/hooks/use-game-state';
import { SessionProvider } from '@app/hooks/use-session';
import { WalletProviderProvider, useWalletProvider } from '@app/hooks/use-wallet-provider';
import { TextButton } from '@app/styles/button.styles';
import {
    DownstreamGame__factory,
    GameConfig,
    Zones721__factory,
    GetZonesDocument,
    GetZonesQuery,
    Wallet,
} from '@downstream/core';
import { ethers } from 'ethers';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { CSSProperties, useCallback, useEffect, useState } from 'react';
import { pipe, subscribe } from 'wonka';
import DownstreamLogo from '@app/assets/downstream-logo-dark.svg';
import Image from 'next/image';
import styled from 'styled-components';
import { NavPanel } from '@app/components/panels/nav-panel';
import { NetworkPanel } from '@app/components/panels/network-panel';
import { Button, Key, Label, ListBox, ListBoxItem, Popover, Select, SelectValue } from 'react-aria-components';

const StyledIndex = styled.div`
    display: flex;
    flex-direction: column;
    justify-content: top;
    align-items: center;

    background-color: #e4e1eb;

    height: 100%;
    overflow: auto;

    .navPanel {
        position: absolute;
        left: 1rem;
        top: 1rem;
    }

    .page {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        text-shadow: 0px 1.5px 0px #fff;
        width: 120rem;
        padding-bottom: 2rem;

        h2 {
            color: #4f475b;
            display: flex;
            flex-direction: row;
            align-items: center;
            justify-content: center;
            font-size: 1.6rem;
            text-align: center;
            margin-top: 2rem;
            margin-bottom: 1rem;
            text-transform: uppercase;

            ::before,
            ::after {
                padding-top: 2rem;
                padding-bottom: 2rem;
                content: ' ';
                flex-grow: 1;
                background-image: url('./stripes-orange.svg');
            }

            span {
                --bracket-spacing: 15px;
                position: relative;
                padding: 0 90px;
                ::before,
                ::after {
                    position: absolute;
                    font-weight: normal;
                    font-size: 3rem;
                    top: 50%;
                    line-height: 0;
                }
                ::before {
                    content: '[';
                    left: var(--bracket-spacing);
                }

                ::after {
                    right: var(--bracket-spacing);
                    content: ']';
                }
            }
        }

        .logo {
            max-width: 70rem;
            margin-top: 1rem;
            margin-bottom: 2rem;
            height: auto;
            margin-left: auto;
            margin-right: auto;
            filter: drop-shadow(0px 2px 0px white);
        }

        .zonePanel {
            margin-top: 2rem;
            flex-grow: 1;

            .zoneFilter {
                position: relative;

                .filterLabel {
                    margin-right: 1rem;
                }
            }

            ul {
                margin: 0;
            }

            li {
                margin-bottom: 1rem;
            }
        }

        .ZoneListHeader {
            display: flex;
            flex-direction: row;
            flex-wrap: nowrap;
            font-weight: bold;
            padding: 0px 10px;

            .zoneImage {
                width: 80px;
                border-radius: 0.5rem;
            }

            .zoneProperties {
                display: flex;
                flex-direction: row;
                flex-grow: 1;
                justify-content: space-around;

                div {
                    width: 250px;

                    :nth-child(3) {
                        width: 370px;
                        overflow: hidden;
                    }

                    :nth-child(4) {
                        width: 80px;
                    }
                }
            }
        }
    }
`;

const StyledPanel = styled.div`
    text-size-adjust: 100%;
    tab-size: 4;
    --step--2: clamp(0.78rem, calc(0.73rem + 0.23vw), 0.96rem);
    --step--1: clamp(0.94rem, calc(0.87rem + 0.33vw), 1.2rem);
    --step-0: clamp(1.13rem, calc(1.02rem + 0.48vw), 1.5rem);
    --step-1: clamp(1.35rem, calc(1.21rem + 0.67vw), 1.88rem);
    --step-2: clamp(1.62rem, calc(1.42rem + 0.92vw), 2.34rem);
    --step-3: clamp(1.94rem, calc(1.68rem + 1.25vw), 2.93rem);
    --step-4: clamp(2.33rem, calc(1.97rem + 1.69vw), 3.66rem);
    --step-5: clamp(2.8rem, calc(2.32rem + 2.26vw), 4.58rem);
    --step-6: clamp(3.36rem, calc(2.72rem + 3vw), 5.72rem);
    --step-7: clamp(4.03rem, calc(3.19rem + 3.96vw), 7.15rem);
    --step-8: clamp(4.84rem, calc(3.73rem + 5.21vw), 8.94rem);
    --step-9: clamp(5.81rem, calc(4.36rem + 6.82vw), 11.18rem);
    --step-10: clamp(6.97rem, calc(5.08rem + 8.89vw), 13.97rem);
    --space-3xs: clamp(0.56rem, calc(0.51rem + 0.24vw), 0.75rem);
    --space-2xs: clamp(0.56rem, calc(0.51rem + 0.24vw), 0.75rem);
    --space-xs: clamp(0.88rem, calc(0.81rem + 0.32vw), 1.13rem);
    --space-s: clamp(1.13rem, calc(1.02rem + 0.48vw), 1.5rem);
    --space-m: clamp(1.69rem, calc(1.54rem + 0.71vw), 2.25rem);
    --space-l: clamp(2.25rem, calc(2.05rem + 0.95vw), 3rem);
    --space-xl: clamp(3.38rem, calc(3.07rem + 1.43vw), 4.5rem);
    --space-2xl: clamp(4.5rem, calc(4.1rem + 1.9vw), 6rem);
    --space-3xl: clamp(6.75rem, calc(6.14rem + 2.86vw), 9rem);
    --space-4xl: clamp(7.88rem, calc(7.17rem + 3.33vw), 10.5rem);
    --space-5xl: clamp(7.88rem, calc(7.17rem + 3.33vw), 10.5rem);
    --space-3xs-2xs: clamp(0.56rem, calc(0.51rem + 0.24vw), 0.75rem);
    --space-2xs-xs: clamp(0.56rem, calc(0.41rem + 0.71vw), 1.13rem);
    --space-xs-s: clamp(0.88rem, calc(0.71rem + 0.79vw), 1.5rem);
    --space-s-m: clamp(1.13rem, calc(0.82rem + 1.43vw), 2.25rem);
    --space-m-l: clamp(1.69rem, calc(1.33rem + 1.67vw), 3rem);
    --space-l-xl: clamp(2.25rem, calc(1.64rem + 2.86vw), 4.5rem);
    --space-xl-2xl: clamp(3.38rem, calc(2.67rem + 3.33vw), 6rem);
    --space-2xl-3xl: clamp(4.5rem, calc(3.29rem + 5.71vw), 9rem);
    --space-3xl-4xl: clamp(6.75rem, calc(5.74rem + 4.76vw), 10.5rem);
    --space-4xl-5xl: clamp(7.88rem, calc(7.17rem + 3.33vw), 10.5rem);
    --space-s-l: clamp(1.13rem, calc(0.62rem + 2.38vw), 3rem);
    --space-xs-xl: clamp(0.88rem, calc(-0.1rem + 4.6vw), 4.5rem);
    line-height: inherit;
    font-weight: 400;
    font-family: Recursive, sans-serif;
    --un-text-opacity: 1;
    color: #4f475b;
    --un-rotate: 0;
    --un-rotate-x: 0;
    --un-rotate-y: 0;
    --un-rotate-z: 0;
    --un-scale-x: 1;
    --un-scale-y: 1;
    --un-scale-z: 1;
    --un-skew-x: 0;
    --un-skew-y: 0;
    --un-translate-x: 0;
    --un-translate-y: 0;
    --un-translate-z: 0;
    --un-pan-x: ;
    --un-pan-y: ;
    --un-pinch-zoom: ;
    --un-scroll-snap-strictness: proximity;
    --un-ordinal: ;
    --un-slashed-zero: ;
    --un-numeric-figure: ;
    --un-numeric-spacing: ;
    --un-numeric-fraction: ;
    --un-border-spacing-x: 0;
    --un-border-spacing-y: 0;
    --un-ring-offset-shadow: 0 0 rgba(0, 0, 0, 0);
    --un-ring-shadow: 0 0 rgba(0, 0, 0, 0);
    --un-ring-inset: ;
    --un-ring-offset-width: 0px;
    --un-ring-offset-color: #fff;
    --un-ring-width: 0px;
    --un-ring-color: rgba(147, 197, 253, 0.5);
    --un-blur: ;
    --un-brightness: ;
    --un-contrast: ;
    --un-drop-shadow: ;
    --un-grayscale: ;
    --un-hue-rotate: ;
    --un-invert: ;
    --un-saturate: ;
    --un-sepia: ;
    --un-backdrop-blur: ;
    --un-backdrop-brightness: ;
    --un-backdrop-contrast: ;
    --un-backdrop-grayscale: ;
    --un-backdrop-hue-rotate: ;
    --un-backdrop-invert: ;
    --un-backdrop-opacity: ;
    --un-backdrop-saturate: ;
    --un-backdrop-sepia: ;
    box-sizing: border-box;
    border-style: solid;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs-s);
    border-radius: 20px;
    padding: var(--space-xs-s);
    position: relative;
    border-width: 3px;
    --un-border-opacity: 1;
    border-color: rgba(168, 162, 181, var(--un-border-opacity));
    --un-bg-opacity: 1;
    background-color: rgba(228, 225, 235, var(--un-bg-opacity));
    --un-shadow: var(--un-shadow-inset) 0 0 20px -5px var(--un-shadow-color, rgba(0, 0, 0, 0.1)),
        var(--un-shadow-inset) 0 0 40px -10px var(--un-shadow-color, rgba(0, 0, 0, 0.1));
    box-shadow: var(--un-ring-offset-shadow), var(--un-ring-shadow), var(--un-shadow);
    --un-shadow-opacity: 1;
    --un-shadow-color: rgba(207, 203, 215, var(--un-shadow-opacity));
    --un-shadow-inset: inset;
`;

enum ZoneFilter {
    AllZones,
    PlayerZones,
    CurrentZone,
}

enum ZoneSorting {
    Newest,
    ActiveUnits,
}

const ZoneMinter = ({
    gameAddress,
    style,
    walletProvider,
    wallet,
}: {
    gameAddress: string;
    style?: CSSProperties;
    walletProvider?: any;
    wallet?: Wallet;
}) => {
    const player = usePlayer();
    const provider = walletProvider?.provider;
    const [error, setError] = useState<string>();
    const [mintPrice, setMintPrice] = useState<bigint>();
    const displayPrice = mintPrice ? `${ethers.formatEther(mintPrice)} ETH` : '';
    const [minting, setMinting] = useState(false);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (!provider) {
            return;
        }
        if (!wallet) {
            return;
        }
        if (!gameAddress) {
            return;
        }
        (async () => {
            const signer = await wallet.signer();
            const downstreamGameContract = DownstreamGame__factory.connect(gameAddress, signer);
            const zonesContractAddr = await downstreamGameContract.zoneOwnership();
            const zonesContract = Zones721__factory.connect(zonesContractAddr, signer);
            const actualMintPrice = await zonesContract.mintPrice();
            setMintPrice(actualMintPrice);
        })().catch((err) => console.error('failed to update mint price', err));
    }, [gameAddress, provider, wallet]);

    const createZone = useCallback(async () => {
        if (minting) {
            console.warn('already minting');
            return;
        }
        if (!player) {
            console.warn('no player');
            return;
        }
        if (!provider) {
            console.warn('no provider');
            return;
        }
        if (!wallet) {
            console.warn('no wallet');
            return;
        }
        if (!gameAddress) {
            console.warn('no game address');
            return;
        }
        try {
            setMinting(true);
            const signer = await wallet.signer();
            const downstreamGameContract = DownstreamGame__factory.connect(gameAddress, signer);
            const zonesContractAddr = await downstreamGameContract.zoneOwnership();
            const zonesContract = Zones721__factory.connect(zonesContractAddr, signer);
            const mintPrice = await zonesContract.mintPrice();
            const tx = await zonesContract.mintTo(player.addr, { value: mintPrice });
            console.log('tx submitted', tx);
            await tx.wait();
        } catch (err) {
            console.error('MINTFAIL:', err);
            setError(`failed, do you have enough ETH?`);
        } finally {
            setMinting(false);
        }
    }, [minting, player, provider, wallet, gameAddress]);

    return (
        <div style={style}>
            {player && (
                <div>
                    <TextButton onClick={createZone} disabled={minting}>
                        {minting ? `loading` : `CREATE ZONE ${displayPrice}`}
                    </TextButton>
                    {error}
                </div>
            )}
        </div>
    );
};

type Zone = GetZonesQuery['game']['state']['zones'][0];
type ZoneUnit = GetZonesQuery['game']['state']['mobileUnits'][0];

const ZoneFilterSelect = ({
    isInZone,
    onSelectionChange,
    selectedKey,
}: {
    isInZone: boolean;
    onSelectionChange: (key: Key) => any;
    selectedKey?: Key;
}) => {
    return (
        <Select className="zoneFilter" onSelectionChange={onSelectionChange} selectedKey={selectedKey}>
            <Label className="filterLabel">Filter</Label>
            <Button>
                <SelectValue />
                <span aria-hidden="true" style={{ marginLeft: '10px' }}>
                    ▼
                </span>
            </Button>
            <Popover>
                <ListBox>
                    <ListBoxItem id={ZoneFilter.AllZones}>All Zones</ListBoxItem>
                    {isInZone && <ListBoxItem id={ZoneFilter.CurrentZone}>Current Zone</ListBoxItem>}
                </ListBox>
            </Popover>
        </Select>
    );
};

const ZoneSortSelect = ({
    onSelectionChange,
    selectedKey,
}: {
    onSelectionChange: (key: Key) => any;
    selectedKey?: Key;
}) => {
    return (
        <Select className="zoneFilter" onSelectionChange={onSelectionChange} selectedKey={selectedKey}>
            <Label className="filterLabel">Sort</Label>
            <Button>
                <SelectValue />
                <span aria-hidden="true" style={{ marginLeft: '10px' }}>
                    ▼
                </span>
            </Button>
            <Popover>
                <ListBox>
                    <ListBoxItem id={ZoneFilter.AllZones}>Newest</ListBoxItem>
                    <ListBoxItem id={ZoneFilter.PlayerZones}>Active Units</ListBoxItem>
                </ListBox>
            </Popover>
        </Select>
    );
};

const ZoneItem = ({
    zone,
    units,
    currentBlock,
    unitTimeoutBlocks,
    zoneUnitLimit,
}: {
    zone: Zone;
    units: ZoneUnit[];
    currentBlock: number;
    unitTimeoutBlocks: number;
    zoneUnitLimit: number;
}) => {
    const StyledZoneItem = styled.li`
        cursor: pointer;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: center;
        background-color: white;
        padding: 1rem;
        border-radius: 0.5rem;

        .zoneImage {
            width: 80px;
            height: 80px;
            background-color: #526caf;
            border-radius: 0.5rem;
            overflow: hidden;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .zoneProperties {
            display: flex;
            flex-direction: row;
            flex-grow: 1;
            justify-content: space-around;

            div {
                width: 250px;

                :nth-child(3) {
                    width: 370px;
                    overflow: hidden;
                }

                overflow: hidden;
                text-overflow: ellipsis;

                :nth-child(4) {
                    width: 80px;
                }
            }
        }
    `;

    const router = useRouter();
    const id = Number(BigInt.asIntN(16, BigInt(zone.key)));
    const name = zone.name?.value ? ethers.decodeBytes32String(zone.name.value) : `unnamed`;
    const description = zone.description?.value ? zone.description.value : '';
    const imageUrl = zone.url?.value ? zone.url.value : '';

    const url = `/zones/${id}`;
    const zoneUnits = units.filter((u) => u.location?.tile?.coords && u.location.tile?.coords[0] === zone.key);
    const activeUnits = zoneUnits.filter((u) => u.location && u.location.time + unitTimeoutBlocks > currentBlock);
    const owner = zone.owner?.addr || '0x0'; //(zone.owner?.addr || '0x0').slice(0, 6) + '...' + (zone.owner?.addr || '0x0').slice(-4);

    const visit = useCallback(() => {
        router.push(url).catch((err) => console.error('failed to navigate', err));
    }, [router, url]);

    return (
        <StyledZoneItem onClick={visit}>
            <div className="zoneImage">{imageUrl && <img src={imageUrl} alt="Zone" />}</div>
            <div className="zoneProperties">
                <div>
                    <Link href={url}>{name}</Link>
                </div>
                <div>{description}</div>
                <div>{owner}</div>
                <div>
                    {activeUnits.length}/{Math.max(zoneUnitLimit, activeUnits.length)}
                </div>
            </div>
        </StyledZoneItem>
    );
};

const Index = ({ config }: { config: Partial<GameConfig> | undefined }) => {
    const player = usePlayer();
    const client = useCogClient();
    const block = useBlock();
    const [zonesData, setZonesData] = useState<GetZonesQuery>();
    const global = useGlobal();
    const unitTimeoutBlocks = parseInt(global?.gameSettings?.unitTimeoutBlocks?.value || '0x0', 16);
    const zoneUnitLimit = parseInt(global?.gameSettings?.zoneUnitLimit?.value || '0x0', 16);
    const [selectedFilter, setSelectedFilter] = useState<Key>(ZoneFilter.AllZones);
    const [selectedSorting, setSelectedSorting] = useState<Key>(ZoneSorting.Newest);
    const { provider: walletProvider } = useWalletProvider();
    const { wallet } = useWallet();

    useEffect(() => {
        if (!config?.gameID) {
            return;
        }
        if (!client) {
            return;
        }
        const { unsubscribe } = pipe(
            client.query(GetZonesDocument, { gameID: config.gameID }),
            subscribe(setZonesData)
        );
        return unsubscribe;
    }, [client, config?.gameID]);

    const gameAddress = zonesData?.game?.id || '0x0';
    const zones = zonesData?.game?.state?.zones || [];
    const units = zonesData?.game?.state?.mobileUnits || [];
    const playerZones = zones.filter((z) => z.owner?.addr && z.owner?.addr === player?.addr);
    const featuredZones = zones.filter((z) => z.isFeatured?.value === 1);
    const playerUnit = units.find((u) => u.owner?.addr && u.owner?.addr === player?.addr);
    const currentZone = zones.find(
        (z) => playerUnit?.location?.tile?.coords && z.key === playerUnit.location.tile.coords[0]
    );

    useEffect(() => {
        if (selectedFilter === ZoneFilter.PlayerZones && playerZones.length === 0) {
            setSelectedFilter(ZoneFilter.AllZones);
        } else if (selectedFilter === ZoneFilter.CurrentZone && !currentZone) {
            setSelectedFilter(ZoneFilter.AllZones);
        }
    }, [currentZone, playerZones, selectedFilter]);

    const handleSelectionChange = useCallback((key: Key) => {
        setSelectedFilter(key);
    }, []);

    const handleSortSelectionChange = useCallback((key: Key) => {
        setSelectedSorting(key);
    }, []);

    return (
        <StyledIndex>
            <NetworkPanel />
            <NavPanel className="navPanel" />
            <div className="page">
                <Image src={DownstreamLogo} alt="Downstream Logo" className="logo" />
                Welcome to Downstream! Please connect your wallet to get started. From this page you can visit an zone
                by clicking on one in the list or create your own zone by clicking the CREATE ZONE button.
                <h2>
                    <span>Zones</span>
                </h2>
                <StyledPanel className="zonePanel">
                        &emsp;
                        <ZoneSortSelect onSelectionChange={handleSortSelectionChange} selectedKey={selectedSorting} />
                    <div className="ZoneListHeader">
                        <div className="zoneImage"></div>
                        <div className="zoneProperties">
                            <div>Name</div>
                            <div>Description</div>
                            <div>Owner</div>
                            <div>Vistors</div>
                        </div>
                    </div>
                    {featuredZones.length > 0 && (
                        <>
                            Spotlight
                            <ul>
                                {featuredZones.map((z) => (
                                    <ZoneItem
                                        key={z.id}
                                        zone={z}
                                        units={units}
                                        currentBlock={block || 0}
                                        unitTimeoutBlocks={unitTimeoutBlocks}
                                        zoneUnitLimit={zoneUnitLimit}
                                    />
                                ))}
                            </ul>
                        </>
                    )}
                    {playerZones.length > 0 && (
                        <>
                            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                Your Zones
                                {player && (
                                    <ZoneMinter
                                        gameAddress={gameAddress}
                                        style={{ marginLeft: 'auto' }}
                                        walletProvider={walletProvider}
                                        wallet={wallet}
                                    />
                                )}
                            </div>
                            <ul>
                                {playerZones.map((z) => (
                                    <ZoneItem
                                        key={z.id}
                                        zone={z}
                                        units={units}
                                        currentBlock={block || 0}
                                        unitTimeoutBlocks={unitTimeoutBlocks}
                                        zoneUnitLimit={zoneUnitLimit}
                                    />
                                ))}
                            </ul>
                        </>
                    )}
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                        <ZoneFilterSelect
                            isInZone={!!currentZone}
                            onSelectionChange={handleSelectionChange}
                            selectedKey={selectedFilter}
                        />
                        {player && playerZones.length == 0 && (
                            <ZoneMinter
                                gameAddress={gameAddress}
                                style={{ marginLeft: 'auto' }}
                                walletProvider={walletProvider}
                                wallet={wallet}
                            />
                        )}
                    </div>

                    <ul>
                        {(selectedFilter == ZoneFilter.AllZones
                            ? zones
                            : selectedFilter == ZoneFilter.PlayerZones
                            ? playerZones
                            : selectedFilter == ZoneFilter.CurrentZone && currentZone
                            ? [currentZone]
                            : zones
                        )
                            .sort(
                                (a, b) =>
                                    units
                                        .filter((u) => u.location?.tile?.coords && u.location.tile?.coords[0] === b.key)
                                        .filter((u) => u.location && u.location.time + unitTimeoutBlocks > (block || 0))
                                        .length -
                                    units
                                        .filter((u) => u.location?.tile?.coords && u.location.tile?.coords[0] === a.key)
                                        .filter((u) => u.location && u.location.time + unitTimeoutBlocks > (block || 0))
                                        .length
                            )
                            .map((z) => (
                                <ZoneItem
                                    key={z.id}
                                    zone={z}
                                    units={units}
                                    currentBlock={block || 0}
                                    unitTimeoutBlocks={unitTimeoutBlocks}
                                    zoneUnitLimit={zoneUnitLimit}
                                />
                            ))}
                    </ul>
                </StyledPanel>
            </div>
        </StyledIndex>
    );
};

export default function IndexPage() {
    const config = useConfig();

    return (
        <WalletProviderProvider config={config}>
            <GameStateProvider config={config}>
                <SessionProvider>
                    <Index config={config} />
                </SessionProvider>
            </GameStateProvider>
        </WalletProviderProvider>
    );
}
