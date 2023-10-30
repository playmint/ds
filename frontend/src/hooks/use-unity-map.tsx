// @refresh reset
import { createContext, ReactNode, useContext, useMemo } from 'react';
import { SendMessageFunc, useGlobalUnityInstance } from './use-unity-instance';

export const disableFastRefresh = 'this export only exists to disable fast-refresh of this file';

export interface UnityMapContextValue {
    ready?: boolean;
    sendMessage?: SendMessageFunc;
    addUnityEventListener?: (eventName: string, callback: (...parameters: any[]) => any) => void;
    removeUnityEventListener?: (eventName: string, callback: (...parameters: any[]) => any) => void;
    containerStyle?: any; // FIXME: find the CSS style type
    setContainerStyle?: (styles: any) => void;
}

export const UnityMapContext = createContext<UnityMapContextValue>({});
export const useUnityMap = () => useContext(UnityMapContext);

export const UnityMapProvider = ({
    children,
    disabled,
    showLoading,
}: {
    children: ReactNode;
    disabled?: boolean;
    showLoading?: boolean;
}) => {
    const { unity, ready, containerStyle, setContainerStyle } = useGlobalUnityInstance({ disabled });
    const { sendMessage, loadingProgression, addEventListener, removeEventListener } = unity;

    const loadingPercentage = loadingProgression ? Math.round(loadingProgression * 100) : 0;

    const value = useMemo(() => {
        if (!ready) {
            return {};
        }
        return {
            addUnityEventListener: addEventListener,
            removeUnityEventListener: removeEventListener,
            sendMessage,
            ready,
            containerStyle,
            setContainerStyle,
        };
    }, [ready, sendMessage, containerStyle, setContainerStyle, addEventListener, removeEventListener]);

    return (
        <UnityMapContext.Provider value={value}>
            {!disabled && showLoading !== false && loadingPercentage < 100 && (
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
