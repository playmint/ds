/** @format */

import { Fragment } from 'react';
import Head from 'next/head';
import { GlobalStyles } from '@app/styles/global.styles';
import { ModalProvider } from '@app/contexts/modal-provider';

function App({ Component, pageProps }: any) {
    return (
        <Fragment>
            <Head>
                <title>DawnSeekers</title>
                <meta name="description" content="DawnSeekers" />
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <GlobalStyles />
            <ModalProvider>
                <Component {...pageProps} />
            </ModalProvider>
        </Fragment>
    );
}

export default App;
