/** @format */

import { FunctionComponent, useEffect } from 'react';
import { ComponentProps } from '@app/types/component-props';
import styled from 'styled-components';
import { styles } from './unity-plugin.styles';
import { UnityContext } from 'react-unity-webgl';
import { useRouter } from 'next/router';
import { useUnityContainerContext } from '@app/contexts/unity-container-provider';
import { LoadingBar } from '@app/components/molecules/loading-bar';
import { useCogPlugin } from '@app/contexts/cog-plugin-provider';

// Stop Unity alerting error messages. gg unity
window.alert = () => {};

export interface UnityPluginProps extends ComponentProps {
    unityContext: UnityContext;
    quitUnity: () => Promise<void>;
}

const StyledUnityPlugin = styled('div')`
    ${styles}
`;

const UnityPlugin: FunctionComponent<UnityPluginProps> = (props: UnityPluginProps) => {
    const { ...otherProps } = props;
    const router = useRouter();
    const { isLoading, progress, unityContext, showUnity, hideUnity } = useUnityContainerContext();
    const { broadcastMessage } = useCogPlugin();

    useEffect(() => {
        showUnity(unityContext);
    }, [unityContext]);

    useEffect(() => {
        if (!unityContext) {
            return;
        }

        unityContext.on('sceneLoaded', (sceneName: string) => {
            console.log(`plugin container: Received sceneLoaded event. sceneName: ${sceneName}`);
        });

        unityContext.on('testCall', () => {
            console.log(`plugin container: Received testCall event.`);
            console.log(`plugin container: Sending message to Unity...`);

            broadcastMessage('EVENT_UNITY_TEST');
            unityContext.send('COG', 'OnTest');
        });

        return () => {
            unityContext.removeEventListener('connectWallet');
            unityContext.removeEventListener('sceneLoaded');
            unityContext.removeEventListener('testCall');
            // if (ethereum) {
            //     ethereum.removeListener('accountsChanged', accountsChanged);
            // }
        };
    }, [unityContext]);

    useEffect(() => {
        const handleRouteChangeStart = (url: string) => {
            if (url === router.pathname) {
                return;
            }
            hideUnity(unityContext);
        };

        router.events.on('routeChangeStart', handleRouteChangeStart);
        return () => {
            router.events.off('routeChangeStart', handleRouteChangeStart);
        };
    }, [unityContext]);

    return (
        <StyledUnityPlugin {...otherProps} isLoading={isLoading}>
            {isLoading && <LoadingBar progress={progress} />}
        </StyledUnityPlugin>
    );
};

export default UnityPlugin;
