/** @format */

import Analytics from '@app/components/organisms/analytics';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';
import { GlobalStyles } from '@app/styles/global.styles';
import { DSProvider } from '@downstream/core';
import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { Fragment, useEffect, useMemo, useState } from 'react';

const App = ({ Component, pageProps }: AppProps) => {
    const [config, setConfig] = useState<any>();
    const commit = useMemo(() => (config?.build || '').slice(0, 8), [config?.build]);

    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    useEffect(() => {
        fetch('/config.json')
            .then((res) => res.json())
            .then(setConfig)
            .catch((err) => console.error('failed to load /config.json', err));
    }, []);

    const enableAnalytics = useMemo(() => /ds-test|downstream.game/.test(window.location.href), []);

    return (
        <Fragment>
            <Head>
                <title>Downstream</title>
                <meta name="description" content="Downstream" />
                <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
                <link rel="manifest" href="/favicon/site.webmanifest" />
                <link rel="mask-icon" href="/favicon/safari-pinned-tab.svg" color="#0d131f" />
                <link rel="shortcut icon" href="/favicon/favicon.ico" />
                <meta name="msapplication-TileColor" content="#0d131f" />
                <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
                <meta name="theme-color" content="#ffffff" />
            </Head>
            {enableAnalytics && <Analytics id="G-19E8TP90ZV" />}
            <GlobalStyles />
            {config && (
                <DSProvider initialConfig={config}>
                    <InventoryProvider>
                        <Component {...pageProps} />
                    </InventoryProvider>
                </DSProvider>
            )}
            <div className="build-version">build v0.1-{commit}</div>
        </Fragment>
    );
};

export default dynamic(() => Promise.resolve(App), {
    ssr: false,
});
