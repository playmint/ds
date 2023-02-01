/** @format */
import { Fragment } from 'react';
import { GlobalStyles } from '@app/styles/global.styles';
import { ModalProvider } from '@app/contexts/modal-provider';
import { UnityContainerProvider } from '@app/contexts/unity-container-provider';
import { CogPluginProvider } from '@app/contexts/cog-plugin-provider';

function App({ Component, pageProps }: any) {
    const gameID = 'latest';

    return (
        <Fragment>
            <GlobalStyles />
            <CogPluginProvider gameID={gameID}>
                <UnityContainerProvider>
                    <ModalProvider>
                        <Component {...pageProps} />
                    </ModalProvider>
                </UnityContainerProvider>
            </CogPluginProvider>
        </Fragment>
    );
}

export default App;
