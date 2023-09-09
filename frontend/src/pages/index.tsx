/** @format */
import Shell from '@app/components/views/shell';
import { useConfig } from '@app/hooks/use-config';
import { SessionProvider } from '@app/hooks/use-session';
import { UnityMapProvider } from '@app/hooks/use-unity-map';
import { WalletProviderProvider } from '@app/hooks/use-wallet-provider';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';
import { DSProvider } from '@downstream/core';

export default function ShellPage() {
    const config = useConfig();

    return (
        <WalletProviderProvider>
            <DSProvider config={config}>
                <SessionProvider>
                    <UnityMapProvider>
                        <InventoryProvider>
                            <Shell />
                            {config && <div className="build-version">build v0.1-{config.commit}</div>}
                        </InventoryProvider>
                    </UnityMapProvider>
                </SessionProvider>
            </DSProvider>
        </WalletProviderProvider>
    );
}
