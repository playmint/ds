/** @format */

import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import Unity, { UnityContext } from 'react-unity-webgl';
import styled from 'styled-components';

export interface UnityContainerContextProviderProps {
    children?: ReactNode;
}

export interface UnityContainerContextStore {
    showUnity: (unityContext: UnityContext | null) => void;
    hideUnity: (unityContext: UnityContext | null) => void;
    unityContext: UnityContext | null;
    isLoading: boolean;
    progress: number;
    accountFetched: boolean;
    setAccountFetched: (accountFetched: boolean) => void;
}

export const UnityContainerContext = createContext<UnityContainerContextStore>({} as UnityContainerContextStore);

export const useUnityContainerContext = () => useContext(UnityContainerContext);

const StyledUnityContainer = styled('div')`
    width: 100%;
    height: 0;

    canvas {
        display: none;
        width: 2%;
        height: 2%;
    }

    &.visible {
        width: 100%;
        height: 100%;

        canvas {
            display: block;
            width: 100%;
            height: 100%;
        }
    }
`;

export const UnityContainerProvider = ({ children }: UnityContainerContextProviderProps) => {
    const [unityContext, setUnityContext] = useState<UnityContext | null>(null);
    const [isVisible, setIsVisible] = useState<boolean>(false);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [progress, setProgress] = useState<number>(0);
    const [accountFetched, setAccountFetched] = useState<boolean>(false);
    const unityContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!unityContext) {
            return;
        }

        unityContext.on('progress', (progression: number) => {
            setIsLoading(progression < 1);
            setProgress(Math.round(progression * 100));
        });

        unityContext.on('error', (message: string) => {
            console.error(message);
        });

        unityContext.on('debug', (message: string) => {
            console.log(message);
        });

        const onMouse = () => {
            const canvas: HTMLCanvasElement | undefined = unityContainerRef.current?.getElementsByTagName('canvas')[0];
            if (canvas) {
                canvas.style['pointer-events'] = 'auto';
            }
        };

        const onScroll = () => {
            const canvas: HTMLCanvasElement | undefined = unityContainerRef.current?.getElementsByTagName('canvas')[0];
            if (canvas) {
                canvas.style['pointer-events'] = 'none';
            }
        };

        unityContext.on('canvas', function (_: HTMLCanvasElement) {
            document.addEventListener('wheel', onScroll, false);
            document.addEventListener('mousemove', onMouse, false);
        });

        return () => {
            unityContext.removeEventListener('progress');
            unityContext.removeEventListener('error');
            unityContext.removeEventListener('debug');
            unityContext.removeEventListener('canvas');
            document.removeEventListener('wheel', onScroll);
            document.removeEventListener('mousemove', onMouse);
        };
    }, [unityContext]);

    const lazyLoad = () => {
        if (unityContext) {
            return;
        }
        const pluginName = 'ds-unity';
        const context = new UnityContext({
            loaderUrl: `/${pluginName}/Build/ds-unity.loader.js`,
            dataUrl: `/${pluginName}/Build/ds-unity.data`,
            frameworkUrl: `/${pluginName}/Build/ds-unity.framework.js`,
            codeUrl: `/${pluginName}/Build/ds-unity.wasm`
        });
        setUnityContext(context);
    };

    const showUnity = (unityContext: UnityContext | null) => {
        lazyLoad();
        setIsVisible(true);
        if (unityContext) {
            console.log('Resuming game');
            // unityContext.send('RpcReceiver', 'OnResumeGame');
        }
    };

    const hideUnity = (unityContext: UnityContext | null) => {
        setIsVisible(false);
        if (unityContext) {
            console.log('Pausing game');
            // unityContext.send('RpcReceiver', 'OnPauseGame');
        }
    };

    const store: UnityContainerContextStore = {
        showUnity,
        hideUnity,
        unityContext,
        isLoading,
        progress,
        accountFetched,
        setAccountFetched
    };

    return (
        <UnityContainerContext.Provider value={store}>
            {children}
            {unityContext && (
                <StyledUnityContainer className={isVisible && !isLoading ? 'visible' : ''} ref={unityContainerRef}>
                    <Unity unityContext={unityContext} />
                </StyledUnityContainer>
            )}
        </UnityContainerContext.Provider>
    );
};
