/** @format */
import Shell from '@app/components/views/shell';
import { useConfig } from '@app/hooks/use-config';
import { GameStateProvider } from '@app/hooks/use-game-state';
import { SessionProvider } from '@app/hooks/use-session';
import { UnityMapProvider } from '@app/hooks/use-unity-map';
import { WalletProviderProvider } from '@app/hooks/use-wallet-provider';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';

export default function ShellPage() {
    const config = useConfig();

    return (
        <WalletProviderProvider>
            <GameStateProvider config={config}>
                <SessionProvider>
                    <UnityMapProvider>
                        <InventoryProvider>
                            <Shell />
                            {config && <div className="build-version">build v0.1-{config.commit}</div>}
                        </InventoryProvider>
                    </UnityMapProvider>
                </SessionProvider>
            </GameStateProvider>
        </WalletProviderProvider>
    );
}
