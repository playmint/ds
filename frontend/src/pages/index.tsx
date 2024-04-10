import { useConfig } from '@app/hooks/use-config';
import { GameStateProvider, useBlock, useCogClient, usePlayer, useWallet } from '@app/hooks/use-game-state';
import { SessionProvider, useSession } from '@app/hooks/use-session';
import { WalletProviderProvider, useWalletProvider } from '@app/hooks/use-wallet-provider';
import { TextButton } from '@app/styles/button.styles';
import {
    DownstreamGame__factory,
    GameConfig,
    Zones721__factory,
    GetZonesDocument,
    GetZonesQuery,
} from '@downstream/core';
import { ethers } from 'ethers';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { pipe, subscribe } from 'wonka';

const ACTIVE_UNIT_TIMEOUT = 10; // FIXME: value should match spawn logic
const UNIT_CAP = 20; // FIXME: value should match real spawn cap

const ZoneMinter = ({ gameAddress }: { gameAddress: string }) => {
    const { connect, disconnect: forgetProvider, provider: walletProvider } = useWalletProvider();
    const player = usePlayer();
    const provider = walletProvider?.provider;
    const { clearSession } = useSession();
    const { wallet } = useWallet();
    const [error, setError] = useState<string>();
    const [mintPrice, setMintPrice] = useState<bigint>();
    const displayPrice = mintPrice ? `${ethers.formatEther(mintPrice)} ETH` : '';
    const [minting, setMinting] = useState(false);

    const disconnect = useCallback(() => {
        if (clearSession) {
            clearSession();
        }
        if (forgetProvider) {
            forgetProvider();
        }
        window.location.reload();
    }, [clearSession, forgetProvider]);

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
        <div>
            {player ? (
                <div>
                    <p>Welcome {player.addr}</p>
                    <TextButton onClick={createZone} disabled={minting}>
                        {minting ? `loading` : `CREATE ZONE ${displayPrice}`}
                    </TextButton>
                    {error}
                    <TextButton onClick={disconnect}>DISCONNECT</TextButton>
                </div>
            ) : (
                <div>
                    <TextButton onClick={connect}>CONNECT</TextButton>
                </div>
            )}
        </div>
    );
};

type Zone = GetZonesQuery['game']['state']['zones'][0];
type ZoneUnit = GetZonesQuery['game']['state']['mobileUnits'][0];

const ZoneItem = ({ zone, units, currentBlock }: { zone: Zone; units: ZoneUnit[]; currentBlock: number }) => {
    const router = useRouter();
    const id = Number(BigInt.asIntN(16, BigInt(zone.key)));
    const name = zone.name?.value ? ethers.decodeBytes32String(zone.name.value) : `unnamed`;
    const description = zone.description?.value ? ethers.decodeBytes32String(zone.description.value) : `no description`;
    const url = `/zones/${id}`;
    const zoneUnits = units.filter((u) => u.location?.tile?.coords && u.location.tile?.coords[0] === zone.key);
    const activeUnits = zoneUnits.filter((u) => u.location && u.location.time + ACTIVE_UNIT_TIMEOUT > currentBlock);
    const availableSlots = UNIT_CAP - activeUnits.length;
    const owner = (zone.owner?.addr || '0x0').slice(0, 6) + '...' + (zone.owner?.addr || '0x0').slice(-4);

    const visit = useCallback(() => {
        router.push(url).catch((err) => console.error('failed to navigate', err));
    }, [router, url]);

    return (
        <li style={{ borderBottom: '1px solid #555', display: 'flex', flexDirection: 'row', flexWrap: 'nowrap' }}>
            <div style={{ padding: '14px' }}>
                <Link href={url}>{name}</Link>
            </div>
            <div style={{ padding: '14px' }}>{description}</div>
            <div style={{ padding: '14px' }}>{owner}</div>
            <div style={{ padding: '14px' }}>{zoneUnits.length} units</div>
            <div style={{ padding: '14px' }}>
                {availableSlots}/{UNIT_CAP} slots
            </div>
            <div style={{ padding: '14px' }}>
                <TextButton onClick={visit}>VISIT</TextButton>
            </div>
        </li>
    );
};

const Index = ({ config }: { config: Partial<GameConfig> | undefined }) => {
    const player = usePlayer();
    const client = useCogClient();
    const block = useBlock();
    const [zonesData, setZonesData] = useState<GetZonesQuery>();

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
    const playerUnit = units.find((u) => u.owner?.addr && u.owner?.addr === player?.addr);
    const currentZone = zones.find(
        (z) => playerUnit?.location?.tile?.coords && z.key === playerUnit.location.tile.coords[0]
    );
    return (
        <div style={{ top: 0, left: 0, right: 0, bottom: 0, position: 'absolute', overflow: 'scroll' }}>
            <h1>Downstream</h1>
            <hr />
            <h2>Claim an island:</h2>
            <ZoneMinter gameAddress={gameAddress} />
            <h2>Island where you unit is:</h2>
            {currentZone ? (
                <ZoneItem key={currentZone.id} zone={currentZone} units={units} currentBlock={block || 0} />
            ) : (
                <p>Your unit is not in any zones</p>
            )}

            <h2>Islands you control:</h2>
            {playerZones.length === 0 && <p>None</p>}
            <ul>
                {playerZones.map((z) => (
                    <ZoneItem key={z.id} zone={z} units={units} currentBlock={block || 0} />
                ))}
            </ul>

            <h2>All islands:</h2>
            {zones.length === 0 && <p>None</p>}
            <ul>
                {zones.map((z) => (
                    <ZoneItem key={z.id} zone={z} units={units} currentBlock={block || 0} />
                ))}
            </ul>
        </div>
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
