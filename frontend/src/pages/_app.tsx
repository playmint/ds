/** @format */

import Analytics from '@app/components/organisms/analytics';
import { ConfigProvider } from '@app/hooks/use-config';
import { GlobalStyles } from '@app/styles/global.styles';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Fragment, useEffect, useMemo } from 'react';

export const App = ({ Component, pageProps }: AppProps) => {
    const host = typeof window != 'undefined' ? window.location.host : null;

    // use canonical url
    useEffect(() => {
        if (!host) {
            return;
        }
        if (/frontend-ds-main.dev.playmint.com/.test(host)) {
            window.location.href = 'https://hexwood0.downstream.game/';
        }
    }, [host]);

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
            <ConfigProvider>
                <Component {...pageProps} />
            </ConfigProvider>
        </Fragment>
    );
};

export default App;
