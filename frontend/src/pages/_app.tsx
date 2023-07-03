/** @format */

import type { AppProps } from 'next/app';
import dynamic from 'next/dynamic';
import { Fragment, useEffect, useState } from 'react';
import Head from 'next/head';
import { GlobalStyles } from '@app/styles/global.styles';
import { DSProvider } from '@dawnseekers/core';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';

const initialConfig = {
    wsEndpoint: process.env.NEXT_PUBLIC_DEFAULT_COG_WS_ENDPOINT || 'ws://localhost:8080/query',
    httpEndpoint: process.env.NEXT_PUBLIC_DEFAULT_COG_HTTP_ENDPOINT || 'http://localhost:8080/query'
};

const App = ({ Component, pageProps }: AppProps) => {
    const [workerReady, setWorkerReady] = useState(false);

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
        const swURL = '/sw.js';
        console.log('[SW]: scopeed /sw/');
        // FIXME: why do I have to un-reg then re-reg for this to
        // work, clearly I'm doing something wrong?!
        navigator.serviceWorker
            .getRegistration(swURL)
            .then((registration): Promise<unknown> => {
                if (registration) {
                    return registration.unregister();
                }

                return Promise.resolve(null);
            })
            .then(() => {
                return navigator.serviceWorker.register(swURL);
            })
            .then(() => {
                return navigator.serviceWorker.ready;
            })
            .then(() => {
                setWorkerReady(true);
            })
            .catch((err) => console.error('[sw] fail reg:', err));
    }, []);

    return (
        <Fragment>
            <Head>
                <title>Downstream</title>
                <meta name="description" content="Downstream" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <GlobalStyles />
            {workerReady ? (
                <DSProvider initialConfig={initialConfig}>
                    <InventoryProvider>
                        <Component {...pageProps} />
                    </InventoryProvider>
                </DSProvider>
            ) : (
                'waiting for worker'
            )}
        </Fragment>
    );
};

export default dynamic(() => Promise.resolve(App), {
    ssr: false
});
