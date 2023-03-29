/** @format */

import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { Fragment, useEffect } from 'react';
import Head from 'next/head';
import { GlobalStyles } from '@app/styles/global.styles';
import { ModalProvider } from '@app/contexts/modal-provider';
import { DSProvider } from '@dawnseekers/core';
import scout from '../plugins/scout';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';

const initialConfig = {
    wsEndpoint: process.env.NEXT_PUBLIC_DEFAULT_COG_WS_ENDPOINT || 'ws://localhost:8080/query',
    httpEndpoint: process.env.NEXT_PUBLIC_DEFAULT_COG_HTTP_ENDPOINT || 'http://localhost:8080/query'
};

const defaultPlugins = [scout];

const App = ({ Component, pageProps }: AppProps) => {
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', handleContextMenu);

        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    return (
        <Fragment>
            <Head>
                <title>DawnSeekers</title>
                <meta name="description" content="DawnSeekers" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <GlobalStyles />
            <DSProvider initialConfig={initialConfig} defaultPlugins={defaultPlugins}>
                <InventoryProvider>
                    <ModalProvider>
                        <Component {...pageProps} />
                    </ModalProvider>
                </InventoryProvider>
            </DSProvider>
        </Fragment>
    );
};

export default dynamic(() => Promise.resolve(App), {
    ssr: false
});
