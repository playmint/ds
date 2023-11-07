import { useCallback, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Unity, useUnityContext } from 'react-unity-webgl';
import { UnityContextHook } from 'react-unity-webgl/distribution/types/unity-context-hook';
import { concat, fromValue, lazy, makeSubject, pipe, Subject, subscribe, tap } from 'wonka';
import { useLocalStorage } from './use-localstorage';
//
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
// !!
// !! WARNING: THIS COMPONENT IS RENDERED OUT OF THE MAIN REACT ROOT
// !!
// !! The Unity WebGL instance and <canvas> get very very very upset if it ever
// !! gets unmounted. To avoid this we render the unity instance once out of tree
// !! directly into document.body, then communicate with the single instance via
// !! global message passing from a proxy context in the main root.
// !!
// !! This allows us to continue to make use of the React wrappers, keep things
// !! compatible with next js, but without unity crashing.
// !!
// !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//

export type SendMessageFunc = (...args: any[]) => void;

export interface UnityMessage {
    msg: string;
}

export interface GlobalUnityContext {
    ready: Subject<boolean>;
    unity: Subject<Partial<UnityContextHook>>;
    setCanvasHeight?: (height: number) => void;
    getCanvasHeight?: () => number;
    updateAspectRatio?: () => void;
}

const g = globalThis as unknown as { __globalUnityContext: GlobalUnityContext };

const host = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '';

const UnityInstance = () => {
    const canvasRef = useRef(null);
    const unity = useUnityContext({
        loaderUrl: `${host}/ds-unity/Build/ds-unity.loader.js`,
        dataUrl: `${host}/ds-unity/Build/ds-unity.data`,
        frameworkUrl: `${host}/ds-unity/Build/ds-unity.framework.js`,
        codeUrl: `${host}/ds-unity/Build/ds-unity.wasm`,
        streamingAssetsUrl: `${host}/ds-unity/StreamingAssets/`,
        companyName: `Playmint`,
        productName: `Downstream`,
        productVersion: `blueprint`,
    });
    const { unityProvider, loadingProgression, addEventListener, removeEventListener, sendMessage } = unity;

    const canvas = canvasRef.current ? (canvasRef.current as HTMLCanvasElement) : null;
    const [canvasHeight, setCanvasHeight] = useLocalStorage<number>(`ds/canvasHeight`, -1);
    const getCanvasHeight = useCallback(() => canvasHeight, [canvasHeight]);

    const onResize = useCallback(() => {
        if (!canvas || !sendMessage) {
            return;
        }
        const mapContainer = typeof document !== 'undefined' ? document.getElementById('map-container') : undefined;
        if (!mapContainer) {
            return;
        }
        const mapContainerBounds = mapContainer.getBoundingClientRect();
        canvas.height = mapContainerBounds.height * window.devicePixelRatio;
        canvas.width = mapContainerBounds.width * window.devicePixelRatio;
        if (g.__globalUnityContext.getCanvasHeight) {
            sendMessage('ResolutionManager', 'SetResolution', JSON.stringify(g.__globalUnityContext.getCanvasHeight()));
        }
        console.info(`canvas size updated to ${canvas.width}x${canvas.height}`);
    }, [canvas, sendMessage]);

    if (g.__globalUnityContext) {
        g.__globalUnityContext.setCanvasHeight = setCanvasHeight;
        g.__globalUnityContext.getCanvasHeight = getCanvasHeight;
        g.__globalUnityContext.updateAspectRatio = onResize;
    }

    useEffect(() => {
        if (!g.__globalUnityContext) {
            return;
        }
        g.__globalUnityContext.unity.next({
            loadingProgression,
            addEventListener,
            removeEventListener,
            sendMessage,
        });
    }, [sendMessage, loadingProgression, addEventListener, removeEventListener]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (typeof window === 'undefined') {
                return;
            }
            if (typeof document === 'undefined') {
                return;
            }
            if (!canvasRef || !canvasRef.current) {
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
            window.removeEventListener('keydown', onKeyDown);
            console.warn('Unity was unmounted, it may now be broken and require a refresh');
        };
    }, []);

    useEffect(() => {
        if (!addEventListener || !removeEventListener) {
            return;
        }

        const onReady = () => {
            g.__globalUnityContext.ready.next(true);
        };

        addEventListener('unityReady', onReady);

        return () => {
            removeEventListener('unityReady', onReady);
        };
    }, [addEventListener, removeEventListener]);

    useEffect(() => {
        if (!onResize) {
            return;
        }
        window.addEventListener('resize', onResize);

        const mediaMatcher = window.matchMedia(`screen and (resolution: ${devicePixelRatio}dppx)`);
        if (!mediaMatcher) {
            return;
        }
        // Adding an event listener to the media matcher which will update the
        // device pixel ratio of the Unity Application when the device pixel
        // ratio changes.
        if (!mediaMatcher.addEventListener) {
            return;
        }
        mediaMatcher.addEventListener('change', onResize);

        // update now
        onResize();

        return () => {
            window.removeEventListener('resize', onResize);
            if (mediaMatcher && mediaMatcher.removeEventListener) {
                mediaMatcher.removeEventListener('change', onResize);
            }
        };
    }, [onResize]);

    return (
        <Unity
            ref={canvasRef}
            style={{ width: '100%', height: '100%' }}
            unityProvider={unityProvider}
            matchWebGLToCanvasSize={false}
            tabIndex={0}
        />
    );
};

// --

const makeUnityContextSubject = () => {
    const { source, ...rest } = makeSubject<UnityContextHook>();
    let prev: UnityContextHook;
    return {
        ...rest,
        source: pipe(
            lazy(() => (prev ? concat([fromValue(prev), source]) : source)),
            tap((v) => (prev = v))
        ),
    };
};

const makeUnityReadySubject = () => {
    const { source, ...rest } = makeSubject<boolean>();
    let prev: boolean;
    return {
        ...rest,
        source: pipe(
            lazy(() => (prev ? concat([fromValue(prev), source]) : source)),
            tap((v) => (prev = v))
        ),
    };
};

export const useGlobalUnityInstance = ({ disabled, display }: { disabled?: boolean; display?: string }) => {
    const [unity, setUnity] = useState<Partial<UnityContextHook>>({});
    const [ready, setReady] = useState<boolean>(false);
    const [containerStyle, setContainerStyleValues] = useState<any>({
        position: 'fixed',
        display: display ? display : 'block',
        width: '100vw',
        height: '100vh',
        top: 0,
    });

    const ctx = g.__globalUnityContext
        ? g.__globalUnityContext
        : ((): GlobalUnityContext => {
              return {
                  unity: makeUnityContextSubject(),
                  ready: makeUnityReadySubject(),
              };
          })();
    g.__globalUnityContext = ctx;

    const setContainerStyle = useCallback((styles: any) => {
        setContainerStyleValues(styles);
        setTimeout(() => {
            if (g.__globalUnityContext.updateAspectRatio) {
                g.__globalUnityContext.updateAspectRatio();
            }
        }, 10);
    }, []);

    if (!disabled) {
        if (typeof document !== 'undefined') {
            const mapContainer = document.getElementById('map-container');
            if (!mapContainer) {
                const mapContainer = document.createElement('div');
                mapContainer.style.display = 'none';
                mapContainer.id = 'map-container';
                document.body.appendChild(mapContainer);
                const root = createRoot(mapContainer);
                setTimeout(() => root.render(<UnityInstance />), 0); // do this async or react cries about nested renders
            }
        }
    }

    const mapContainer = typeof document !== 'undefined' ? document.getElementById('map-container') : undefined;

    useEffect(() => {
        if (!mapContainer) {
            return;
        }
        for (const k in containerStyle) {
            mapContainer.style[k] = containerStyle[k];
        }
    }, [containerStyle, mapContainer]);

    useEffect(() => {
        const { unsubscribe } = pipe(
            ctx.unity.source,
            subscribe((v) => setUnity(v))
        );
        return unsubscribe;
    }, [ctx.unity.source]);

    useEffect(() => {
        const { unsubscribe } = pipe(
            ctx.ready.source,
            subscribe((v) => setReady(v))
        );
        return unsubscribe;
    }, [ctx.ready.source]);

    // hide show on mount/unmount
    const defaultDisplay = containerStyle.display;
    useEffect(() => {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.style.display = defaultDisplay;
        }
        return () => {
            const mapContainer = document.getElementById('map-container');
            if (mapContainer) {
                mapContainer.style.display = 'none';
            }
        };
    }, [defaultDisplay]);

    return { unity, ready, containerStyle, setContainerStyle };
};
