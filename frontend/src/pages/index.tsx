/** @format */
import Shell from '@app/components/views/shell';
import { useConfig } from '@app/hooks/use-config';
import { UnityMapProvider } from '@app/hooks/use-unity-map';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';
import { DSProvider } from '@downstream/core';

export default function ShellPage() {
    const config = useConfig();

    return (
        <DSProvider config={config}>
            <InventoryProvider>
                <UnityMapProvider>
                    <Shell />
                    {config && <div className="build-version">build v0.1-{config.commit}</div>}
                </UnityMapProvider>
            </InventoryProvider>
        </DSProvider>
    );
}
