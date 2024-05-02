/** @format */
import { NetworkPanel } from '@app/components/panels/network-panel';
import Shell from '@app/components/views/shell';
import { useConfig } from '@app/hooks/use-config';
import { GameStateProvider } from '@app/hooks/use-game-state';
import { SessionProvider } from '@app/hooks/use-session';
import { UnityMapProvider } from '@app/hooks/use-unity-map';
import { WalletProviderProvider } from '@app/hooks/use-wallet-provider';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';
import { CompoundKeyEncoder, NodeSelectors } from '@downstream/core';
// import { useRouter } from 'next/router';

export type ZonePageProps = {
    id: string;
};

export default function ZonePage({ id }: ZonePageProps) {
    const config = useConfig();
    // const router = useRouter();
    const zoneParam = id; //Array.isArray(router.query.id) ? router.query.id[0] : router.query.id;
    const zoneId = zoneParam ? CompoundKeyEncoder.encodeUint160(NodeSelectors.Zone, BigInt(zoneParam)) : undefined;
    if (!zoneId) {
        return <div>INVALID_ZONE_ID</div>;
    }

    return (
        <UnityMapProvider>
            <WalletProviderProvider config={config}>
                <NetworkPanel />
                <GameStateProvider config={config} zoneId={zoneId}>
                    <SessionProvider>
                        <InventoryProvider>
                            <Shell />
                            {config && <div className="build-version">build v0.1-{config.commit}</div>}
                        </InventoryProvider>
                    </SessionProvider>
                </GameStateProvider>
            </WalletProviderProvider>
        </UnityMapProvider>
    );
}

export async function getStaticPaths() {
    const paths = Array.from(new Array(32000)).map((_, idx) => ({
        params: { id: `${idx + 1}` },
    }));
    return { paths, fallback: false };
}

export async function getStaticProps({ params }) {
    const props: ZonePageProps = { id: params.id };
    return { props };
}
