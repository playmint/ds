/** @format */

import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Anchor } from '@app/types/anchor';
import { Interface } from 'ethers/lib/utils';

export interface CogPluginContextProviderProps {
    children?: ReactNode;
    gameID: string;
    actions?: Interface;
}

export interface CogPluginContextStore {
    isReady: boolean;
    registerPlugin: (width: number, height: number, anchor: Anchor) => void;
    dispatchAction: (actionName: string, ...actionArgs: any) => void;
    broadcastMessage: (eventName: string, ...eventArgs: any) => void;
}

export const CogPluginContext = createContext<CogPluginContextStore>({} as CogPluginContextStore);

export const useCogPlugin = () => useContext(CogPluginContext);

export const CogPluginProvider = ({ children, gameID, actions }: CogPluginContextProviderProps) => {
    const [isReady, setIsReady] = useState<boolean>(false);

    const registerPlugin = (width: number, height: number, anchor: Anchor) => {
        // todo handle being the top level window
        if (!window.top) return;

        // NOTE: Perhaps not the best way of doing this but at least allows us to load from external urls
        const url = window.location.pathname.length > 1 ? window.location.pathname : window.location.href;

        console.log('CogPluginProvider: registerPlugin() url:', url);

        window.top.postMessage(
            {
                method: 'registerPlugin',
                args: {
                    url,
                    width,
                    height,
                    anchor,
                    x: 0,
                    y: 0
                }
            },
            '*'
        );
    };

    const dispatchAction = (actionName: string, ...actionArgs: any) => {
        // todo handle being the top level window
        if (!window.top) return;
        if (!actions) return;

        // todo use the full url not just the path
        const url = window.location.pathname;
        const action = actions.encodeFunctionData(actionName, actionArgs);
        console.log(`CogPluginProvider.dispatch: gameID: ${gameID} actionName: ${actionName} action: ${action}`);

        window.top.postMessage(
            {
                method: 'dispatchAction',
                args: {
                    url,
                    gameID,
                    action
                }
            },
            '*'
        );
    };

    const broadcastMessage = (eventName: string, ...eventArgs: any) => {
        // todo handle being the top level window
        if (!window.top) return;

        // todo use the full url not just the path
        const url = window.location.pathname;
        console.log(`CogPluginProvider.broadcastMessage: eventName: ${eventName} eventArgs:`, eventArgs);

        window.top.postMessage(
            {
                method: 'broadcastMessage',
                args: {
                    url,
                    eventName,
                    eventArgs
                }
            },
            '*'
        );
    };

    useEffect(() => {
        const handleMessage = (event: any) => {
            const { method } = event.data;
            if (method == 'ready') {
                console.log('Ready', window.location.pathname);
                setIsReady(true);
            }
        };

        // wait for message from parent to say ready
        window.addEventListener('message', handleMessage);

        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const store: CogPluginContextStore = {
        isReady,
        registerPlugin,
        dispatchAction,
        broadcastMessage
    };
    return <CogPluginContext.Provider value={store}>{children}</CogPluginContext.Provider>;
};
