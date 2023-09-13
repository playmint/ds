// @refresh reset
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo } from 'react';
import { pipe, subscribe } from 'wonka';
import { SendMessageFunc, UnityMessage, useGlobalUnityInstance } from './use-unity-instance';

export const disableFastRefresh = 'this export only exists to disable fast-refresh of this file';

export interface UnityMapContextValue {
    ready?: boolean;
    sendMessage?: SendMessageFunc;
}

export const UnityMapContext = createContext<UnityMapContextValue>({});
export const useUnityMap = () => useContext(UnityMapContext);

export const UnityMapProvider = ({ children }: { children: ReactNode; disabled?: boolean }) => {
    const { unity, ready, messages } = useGlobalUnityInstance();
    const { sendMessage, loadingProgression } = unity;

    const loadingPercentage = loadingProgression ? Math.round(loadingProgression * 100) : 0;

    const processMessage = useCallback((msgObj: UnityMessage) => {
        switch (msgObj.msg) {
            case 'something': {
                // TODO: handle messages from unity land
                break;
            }

            default: {
                console.warn('unhandled message from map:', msgObj);
            }
        }
    }, []);

    useEffect(() => {
        if (!processMessage) {
            return;
        }
        if (!messages) {
            return;
        }
        const { unsubscribe } = pipe(messages, subscribe(processMessage));
        return unsubscribe;
    }, [messages, processMessage]);

    const value = useMemo(() => {
        if (!ready) {
            return {};
        }
        return {
            sendMessage,
            ready,
        };
    }, [ready, sendMessage]);

    return (
        <UnityMapContext.Provider value={value}>
            {loadingPercentage < 100 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: '#030f25',
                        height: '30px',
                        width: '100%',
                        maxWidth: '300px',
                        textAlign: 'center',
                        color: '#fff',
                        borderRadius: '5px',
                    }}
                >
                    <div
                        style={{
                            backgroundColor: '#143063',
                            height: '100%',
                            width: `${loadingPercentage}%`,
                            transition: 'width .3s',
                            borderRadius: '5px',
                        }}
                    />
                </div>
            )}
            {children}
        </UnityMapContext.Provider>
    );
};
