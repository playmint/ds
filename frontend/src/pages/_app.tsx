/** @format */

import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { Fragment } from 'react';
import Head from 'next/head';
import { GlobalStyles } from '@app/styles/global.styles';
import { ModalProvider } from '@app/contexts/modal-provider';
import { DSProvider } from '@dawnseekers/core';
import scout from '../plugins/scout';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';

const initialConfig = {
    wsEndpoint: 'ws://localhost:8080/query',
    httpEndpoint: 'http://localhost:8080/query'
};

const defaultPlugins = [scout];

const App = ({ Component, pageProps }: AppProps) => {
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
