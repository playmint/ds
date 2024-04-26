/** @format */

import Analytics from '@app/components/organisms/analytics';
import { ConfigProvider } from '@app/hooks/use-config';
import { NetworkPanel } from '@app/components/panels/network-panel';
import { GlobalStyles } from '@app/styles/global.styles';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Fragment, useEffect, useMemo } from 'react';

export const App = ({ Component, pageProps }: AppProps) => {
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    const enableAnalytics = useMemo(
        () => typeof window != 'undefined' && /ds-test|downstream.game/.test(window.location.href),
        []
    );

    return (
        <Fragment>
            <Head>
                <title>Downstream</title>
                <meta name="description" content="Downstream" />
                <link href="/favicon-28978_favicon-32.png" rel="icon" type="image/png" sizes="32x32" />
                <link href="/favicon-28978_favicon-192.png" rel="icon" type="image/png" sizes="192x192" />
                <meta name="msapplication-TileColor" content="#0d131f" />
                <meta name="theme-color" content="#ffffff" />
            </Head>
            {enableAnalytics && <Analytics id="G-19E8TP90ZV" />}
            <GlobalStyles />
            <ConfigProvider>
                <NetworkPanel />
                <Component {...pageProps} />
            </ConfigProvider>
        </Fragment>
    );
};

export default App;
