/** @format */

import { ComponentProps } from '@app/types/component-props';
import { SelectionSelectors } from '@downstream/core';
import { memo, PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { Unity, useUnityContext } from 'react-unity-webgl';
import { UnityProvider } from 'react-unity-webgl/distribution/types/unity-provider';
import styled from 'styled-components';
import { styles } from './unity-map.styles';

export const useUnityMap = () => {
    return useUnityContext({
        loaderUrl: `/ds-unity/Build/ds-unity.loader.js`,
        dataUrl: `/ds-unity/Build/ds-unity.data`,
        frameworkUrl: `/ds-unity/Build/ds-unity.framework.js`,
        codeUrl: `/ds-unity/Build/ds-unity.wasm`,
        streamingAssetsUrl: `/ds-unity/StreamingAssets/`,
        companyName: `Playmint`,
        productName: `Downstream`,
        productVersion: `blueprint`,
    });
};

type SendMessageFunc = (gameObjectName: string, methodName: string, ...params: any[]) => void;

export interface TileProps {
    sendMessage: SendMessageFunc;
    isReady: boolean;
    addUnityEventListener: (event: string, handler: any) => void;
    removeUnityEventListener: (event: string, handler: any) => void;
    id: string;
    biome: number;
    q: number;
    r: number;
    s: number;
    onPointerEnter?: (o: { id: string }) => void;
    onPointerExit?: (o: { id: string }) => void;
    onPointerClick?: (o: { id: string }) => void;
}

export const Tile = memo(
    ({
        id,
        q,
        r,
        s,
        biome,
        sendMessage,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
        isReady,
        addUnityEventListener,
        removeUnityEventListener,
    }: TileProps) => {
        useEffect(() => {
            if (!isReady) {
                return;
            }
            // console.log('SetTile', id);
            sendMessage('MapManager', 'SetTileJSON', JSON.stringify({ id, q, r, s, biome }));
        }, [id, q, r, s, biome, sendMessage, isReady]);

        useEffect(() => {
            if (!isReady) {
                return;
            }
            return () => {
                if (!isReady) {
                    return;
                }
                // console.log('RemoveTile', id);
                sendMessage('MapManager', 'RemoveTile', id);
            };
        }, [id, sendMessage, isReady]);

        const pointerEnterHandler = useCallback(() => {
            if (!onPointerEnter) {
                return;
            }
            onPointerEnter({ id });
            // console.log('fired pointerenter', id);
        }, [id, onPointerEnter]);

        const pointerExitHandler = useCallback(() => {
            if (!onPointerExit) {
                return;
            }
            onPointerExit({ id });
            // console.log('fired pointerexit', id);
        }, [id, onPointerExit]);

        const pointerClickHandler = useCallback(() => {
            if (!onPointerClick) {
                return;
            }
            onPointerClick({ id });
            // console.log('fired pointerexit', id);
        }, [id, onPointerClick]);

        useEffect(() => {
            const eventName = `tile_pointer_enter_${q}_${r}_${s}`;
            addUnityEventListener(eventName, pointerEnterHandler);
            // console.log('listening', eventName);
            return () => {
                removeUnityEventListener(eventName, pointerEnterHandler);
            };
        }, [addUnityEventListener, removeUnityEventListener, pointerEnterHandler, q, r, s]);

        useEffect(() => {
            const eventName = `tile_pointer_exit_${q}_${r}_${s}`;
            addUnityEventListener(eventName, pointerExitHandler);
            return () => {
                removeUnityEventListener(eventName, pointerExitHandler);
            };
        }, [addUnityEventListener, removeUnityEventListener, pointerExitHandler, q, r, s]);

        useEffect(() => {
            const eventName = `tile_pointer_click_${q}_${r}_${s}`;
            addUnityEventListener(eventName, pointerClickHandler);
            return () => {
                removeUnityEventListener(eventName, pointerClickHandler);
            };
        }, [addUnityEventListener, removeUnityEventListener, pointerClickHandler, q, r, s]);

        return null;
    }
);

export interface MobileUnitProps {
    sendMessage: SendMessageFunc;
    isReady: boolean;
    addUnityEventListener: (event: string, handler: any) => void;
    removeUnityEventListener: (event: string, handler: any) => void;
    id: string;
    q: number;
    r: number;
    s: number;
    onPointerEnter?: (o: { id: string }) => void;
    onPointerExit?: (o: { id: string }) => void;
    onPointerClick?: (o: { id: string }) => void;
}

export const MobileUnit = memo(
    ({
        id,
        q,
        r,
        s,
        sendMessage,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
        isReady,
        addUnityEventListener,
        removeUnityEventListener,
    }: MobileUnitProps) => {
        useEffect(() => {
            if (!isReady) {
                return;
            }
            // console.log('SetMobileUnit', id, q, r, s);
            sendMessage('MobileUnitManager', 'SetJSON', JSON.stringify({ id, q, r, s }));
        }, [id, q, r, s, sendMessage, isReady]);

        useEffect(() => {
            if (!isReady) {
                return;
            }
            return () => {
                if (!isReady) {
                    return;
                }
                // console.log('RemoveMobileUnit', id);
                sendMessage('MobileUnitManager', 'Remove', id);
            };
        }, [id, sendMessage, isReady]);

        const pointerEnterHandler = useCallback(() => {
            if (!onPointerEnter) {
                return;
            }
            onPointerEnter({ id });
            // console.log('fired pointerenter', id);
        }, [id, onPointerEnter]);

        const pointerExitHandler = useCallback(() => {
            if (!onPointerExit) {
                return;
            }
            onPointerExit({ id });
            // console.log('fired pointerexit', id);
        }, [id, onPointerExit]);

        const pointerClickHandler = useCallback(() => {
            if (!onPointerClick) {
                return;
            }
            onPointerClick({ id });
            // console.log('fired pointerexit', id);
        }, [id, onPointerClick]);

        useEffect(() => {
            const eventName = `mobileunit_pointer_enter_${q}_${r}_${s}`;
            addUnityEventListener(eventName, pointerEnterHandler);
            // console.log('listening', eventName);
            return () => {
                removeUnityEventListener(eventName, pointerEnterHandler);
            };
        }, [addUnityEventListener, removeUnityEventListener, pointerEnterHandler, q, r, s]);

        useEffect(() => {
            const eventName = `mobileunit_pointer_exit_${q}_${r}_${s}`;
            addUnityEventListener(eventName, pointerExitHandler);
            return () => {
                removeUnityEventListener(eventName, pointerExitHandler);
            };
        }, [addUnityEventListener, removeUnityEventListener, pointerExitHandler, q, r, s]);

        useEffect(() => {
            const eventName = `mobileunit_pointer_click_${q}_${r}_${s}`;
            addUnityEventListener(eventName, pointerClickHandler);
            return () => {
                removeUnityEventListener(eventName, pointerClickHandler);
            };
        }, [addUnityEventListener, removeUnityEventListener, pointerClickHandler, q, r, s]);

        return null;
    }
);

export interface HighlightProps {
    sendMessage: SendMessageFunc;
    isReady: boolean;
    addUnityEventListener: (event: string, handler: any) => void;
    removeUnityEventListener: (event: string, handler: any) => void;
    id: string;
    q: number;
    r: number;
    s: number;
}

export const Highlight = memo(({ id, q, r, s, sendMessage, isReady }: HighlightProps) => {
    useEffect(() => {
        if (!isReady) {
            return;
        }
        // console.log('SetHighlight', id);
        sendMessage('HighlightManager', 'SetJSON', JSON.stringify({ id, q, r, s }));
    }, [id, q, r, s, sendMessage, isReady]);

    useEffect(() => {
        if (!isReady) {
            return;
        }
        return () => {
            if (!isReady) {
                return;
            }
            // console.log('RemoveHighlight', id);
            sendMessage('HighlightManager', 'Remove', id);
        };
    }, [id, sendMessage, isReady]);

    return null;
});

const StyledUnityMap = styled('div')`
    ${styles}
`;

export interface UnityMapProps extends ComponentProps, Partial<SelectionSelectors> {
    unityProvider: UnityProvider;
}

export const UnityMap = ({ unityProvider, children, ...otherProps }: PropsWithChildren<UnityMapProps>) => {
    // We'll use a state to store the device pixel ratio.
    const [devicePixelRatio, setDevicePixelRatio] = useState(window.devicePixelRatio);
    const canvasRef = useRef(null);

    useEffect(() => {
        // A function which will update the device pixel ratio of the Unity
        // Application to match the device pixel ratio of the browser.
        const updateDevicePixelRatio = function () {
            setDevicePixelRatio(window.devicePixelRatio);
        };
        // A media matcher which watches for changes in the device pixel ratio.
        const mediaMatcher = window.matchMedia(`screen and (resolution: ${devicePixelRatio}dppx)`);
        // Adding an event listener to the media matcher which will update the
        // device pixel ratio of the Unity Application when the device pixel
        // ratio changes.
        mediaMatcher.addEventListener('change', updateDevicePixelRatio);
        return function () {
            // Removing the event listener when the component unmounts.
            mediaMatcher.removeEventListener('change', updateDevicePixelRatio);
        };
    }, [devicePixelRatio]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!canvasRef.current) {
                return;
            }
            if (!(e.target instanceof Element)) {
                return;
            }
            if (document.activeElement == canvasRef.current) {
                return;
            }
            const tagName = e.target.tagName.toLowerCase();
            if (/select|input|textarea|select/.test(tagName)) {
                return;
            }
            e.stopImmediatePropagation();
            const canvas = canvasRef.current as HTMLElement;
            canvas.focus();
            canvas.dispatchEvent(
                new KeyboardEvent('keydown', {
                    key: e.key,
                    keyCode: e.keyCode,
                    code: e.code,
                    which: e.which,
                    shiftKey: false,
                    ctrlKey: false,
                    metaKey: false,
                })
            );
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            removeEventListener('keydown', onKeyDown);
        };
    }, []);

    return (
        <StyledUnityMap {...otherProps}>
            <Unity ref={canvasRef} unityProvider={unityProvider} devicePixelRatio={devicePixelRatio} tabIndex={0} />
            {children}
        </StyledUnityMap>
    );
};
