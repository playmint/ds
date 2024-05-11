import { ethers } from 'ethers';
import {
    DownstreamLogo,
    EmbossedBottomPanel,
    EmbossedTopPanel,
    HeroPanel,
    PlaymintFooter,
    IconButton,
    ZoneRow,
    Sticker,
    HeroButton,
    SpotlightTitle,
    FilterBar,
    ZoneFilterFunc,
    Zone,
    ZoneUnit,
    ZoneWithActivity,
} from '@app/components/molecules';
import { NetworkPanel } from '@app/components/panels/network-panel';
import { useConfig } from '@app/hooks/use-config';
import { GameStateProvider, useCogClient, useGlobal, usePlayer, useWallet } from '@app/hooks/use-game-state';
import { SessionProvider } from '@app/hooks/use-session';
import { WalletProviderProvider, useWalletProvider } from '@app/hooks/use-wallet-provider';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import iconUnit from '@app/assets/icon-unit.svg';
import { pipe, subscribe } from 'wonka';
import {
    DownstreamGame__factory,
    GameConfig,
    GetZonesDocument,
    GetZonesQuery,
    Zones721__factory,
} from '@downstream/core';

const ByKey = (a: ZoneWithActivity, b: ZoneWithActivity) => (b.id - a.id ? 1 : -1);
const byActivity = (a: ZoneWithActivity, b: ZoneWithActivity) => {
    const activeCount = b.activeUnits.length - a.activeUnits.length;
    if (activeCount === 0) {
        return b.lastActiveUnit - a.lastActiveUnit;
    }
    return activeCount;
};

import styled from 'styled-components';
import { NavPanel } from '@app/components/panels/nav-panel';

const StyledIndex = styled.div`
    width: 1216px;
    margin: 0 auto;
    zoom: 90%;
    input:focus {
        outline: none;
    }
`;

const ZoneMintButton = ({
    gameAddress,
    onMint,
    style,
}: {
    gameAddress: string;
    style?: React.CSSProperties;
    onMint: () => void;
}) => {
    const player = usePlayer();
    const { provider: walletProvider } = useWalletProvider();
    const { wallet } = useWallet();
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
            onMint();
            setError(`Mint successful! Please find your Zone in the list below!`);
        } catch (err) {
            console.error('MINTFAIL:', err);
            setError(`failed, do you have enough ETH?`);
        } finally {
            setMinting(false);
        }
    }, [minting, player, provider, wallet, gameAddress, onMint]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...style }}>
            {player && wallet ? (
                <HeroButton onClick={createZone} disabled={minting}>
                    {minting ? `loading` : `CLAIM ZONE ${displayPrice}`}
                </HeroButton>
            ) : (
                <HeroButton onClick={() => {}} disabled={true}>
                    CONNECT WALLET FIRST
                </HeroButton>
            )}
            {error}
        </div>
    );
};

const ZoneList = ({
    zones,
    onClickEnter,
}: {
    zones: ZoneWithActivity[];
    units: ZoneUnit[];
    blockNumber: number;
    unitTimeoutBlocks: number;
    unitZoneLimit: number;
    onClickEnter: (id: number) => void;
}) => {
    return (
        <div>
            {zones.map((zone) => (
                <ZoneRow
                    key={zone.key}
                    id={zone.id}
                    name={zone.name}
                    description={zone.description?.value || `Unknown zone #${zone.id}`}
                    activeUnits={zone.activeUnits.length}
                    maxUnits={zone.maxUnits}
                    imageURL={zone.url?.value ? zone.url.value : 'https://assets.downstream.game/tile.png'}
                    onClickEnter={onClickEnter}
                    ownerAddress={zone.owner?.addr || '0x0'}
                />
            ))}
        </div>
    );
};

const ZoneIndex = ({ config }: { config: Partial<GameConfig> | undefined }) => {
    const [toggleValueRaw, setToggleValue] = useState<string>('ACTIVE');
    const router = useRouter();
    const player = usePlayer();
    const client = useCogClient();
    const [zonesData, setZonesData] = useState<GetZonesQuery>();
    const global = useGlobal();
    const unitTimeoutBlocks = parseInt(global?.gameSettings?.unitTimeoutBlocks?.value || '0x0', 16);
    const zoneUnitLimit = parseInt(global?.gameSettings?.zoneUnitLimit?.value || '0x0', 16);
    const gameAddress = zonesData?.game?.id || '0x0';
    const blockNumber = zonesData?.game?.state?.block || 0;
    const units = useMemo(() => zonesData?.game?.state?.mobileUnits || [], [zonesData?.game?.state?.mobileUnits]);

    // load the zones data
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

    // normalize the zone data
    const zones: ZoneWithActivity[] = useMemo(() => {
        return (zonesData?.game?.state?.zones || [])
            .map((zone: Zone) => {
                const id = Number(BigInt.asIntN(16, BigInt(zone.key)));
                const name = zone.name?.value ? ethers.decodeBytes32String(zone.name.value) : `Zone #${id}`;
                const zoneUnits = units.filter(
                    (u) => u.location?.tile?.coords && u.location.tile?.coords[0] === zone.key
                );
                const activeUnits = zoneUnits.filter(
                    (u) => u.location && u.location.time + unitTimeoutBlocks > blockNumber
                );
                const lastActiveUnit = zoneUnits.reduce(
                    (lastActiveUnit, u) =>
                        u.location && u.location.time > lastActiveUnit ? u.location.time : lastActiveUnit,
                    0
                );
                // best guess at what "active" means....
                // someone should have entered the zone at some point
                // number of deployed tiles > 1
                const isActive = zone.tileCount > 1 && lastActiveUnit > 0;
                return {
                    ...zone,
                    id,
                    name,
                    activeUnits,
                    zoneUnits,
                    maxUnits: zoneUnitLimit,
                    lastActiveUnit,
                    isActive,
                };
            })
            .sort(ByKey);
    }, [blockNumber, unitTimeoutBlocks, units, zoneUnitLimit, zonesData?.game?.state?.zones]);
    const [filterFunc, setFilterFuncRaw] = useState<ZoneFilterFunc>(() => () => true);

    const onClickDiscord = useCallback(() => {
        window.location.href = 'https://discord.gg/SG3fwmgGXH';
    }, []);

    const onClickEnter = useCallback(
        (id: number) => {
            const url = `/zones/${id}`;
            router.push(url).catch((err) => console.error('failed to navigate', err));
        },
        [router]
    );

    const featuredZones = useMemo(() => zones.filter((z) => z.isFeatured?.value === 1), [zones]);
    const filteredAndSortedZones = useMemo(() => zones.filter(filterFunc).sort(byActivity), [zones, filterFunc]);

    const navPanelStyle = useMemo(() => ({ height: '64px' }), []);
    const setFilterFunc = useCallback((f: ZoneFilterFunc) => {
        return setFilterFuncRaw(() => f);
    }, []);

    const onMint = useCallback(() => {
        setToggleValue('YOURS');
    }, []);

    return (
        <StyledIndex>
            <EmbossedTopPanel />
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '68px 0',
                    minHeight: '80px',
                }}
            >
                <NavPanel style={navPanelStyle} />
                <DownstreamLogo />
                <IconButton icon="discord" onClick={onClickDiscord} />
            </div>
            <HeroPanel>
                <Image src={iconUnit} alt="unit" />
                <div
                    style={{
                        width: 800,
                        textAlign: 'center',
                        color: '#4F475B',
                        fontSize: 18,
                        fontFamily: 'Recursive',
                        fontWeight: '400',
                        letterSpacing: 0.36,
                        wordWrap: 'break-word',
                        marginTop: 18,
                        marginBottom: 18,
                    }}
                >
                    Jump into the welcome zone and player made creations to get inspired. Once {`you're`} ready to build
                    something new, claim a zone to start work on your masterpiece!
                </div>
                <ZoneMintButton gameAddress={gameAddress} style={{ marginTop: 18 }} onMint={onMint} />
            </HeroPanel>
            <div>
                <SpotlightTitle>SPOTLIGHT</SpotlightTitle>
                <ZoneList
                    zones={featuredZones}
                    blockNumber={blockNumber}
                    unitTimeoutBlocks={unitTimeoutBlocks}
                    units={units}
                    unitZoneLimit={zoneUnitLimit}
                    onClickEnter={onClickEnter}
                />
            </div>
            <div style={{ marginTop: 64 }}>
                <FilterBar
                    onChangeFilter={setFilterFunc}
                    playerAddress={player?.addr}
                    toggleValueRaw={toggleValueRaw}
                    setToggleValue={setToggleValue}
                >
                    SHOWING {filteredAndSortedZones.length} LOCATIONS
                </FilterBar>
                {filteredAndSortedZones.length > 0 ? (
                    <ZoneList
                        zones={filteredAndSortedZones}
                        blockNumber={blockNumber}
                        unitTimeoutBlocks={unitTimeoutBlocks}
                        units={units}
                        unitZoneLimit={zoneUnitLimit}
                        onClickEnter={onClickEnter}
                    />
                ) : (
                    <p style={{ textAlign: 'center' }}>NO ZONES MATCH FILTER</p>
                )}
            </div>
            <PlaymintFooter />
            <EmbossedBottomPanel />
        </StyledIndex>
    );
};

export default function IndexPage() {
    const config = useConfig();

    return (
        <WalletProviderProvider config={config}>
            <NetworkPanel />
            <GameStateProvider config={config}>
                <SessionProvider>
                    <div
                        style={{
                            width: '100%',
                            height: '100vh',
                            overflow: 'scroll',
                            position: 'relative',
                        }}
                    >
                        <div
                            style={{
                                top: 0,
                                left: 0,
                                width: '100%',
                                padding: 16,
                                backgroundColor: 'rgba(0,0,0,0.99)',
                                color: 'white',
                                fontSize: 18,
                                zIndex: 1000,
                                textAlign: 'center',
                            }}
                        >
                            Working on something cool? Sign up for the Redstone hackathon{' '}
                            <a
                                href="https://t.co/LX7XzmFpby"
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: 'white' }}
                            >
                                here
                            </a>
                        </div>
                        <ZoneIndex config={config} />
                        <div style={{ width: '100%', position: 'absolute', top: 200 }}>
                            <Sticker image="unit" style={{ position: 'absolute', left: -0, top: 80 }} />
                            <Sticker image="eye" style={{ position: 'absolute', right: -0, top: 130 }} />
                        </div>
                    </div>
                </SessionProvider>
            </GameStateProvider>
        </WalletProviderProvider>
    );
}
