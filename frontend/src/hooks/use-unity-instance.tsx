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

    if (g.__globalUnityContext) {
        g.__globalUnityContext.setCanvasHeight = setCanvasHeight;
        g.__globalUnityContext.getCanvasHeight = getCanvasHeight;
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
        if (!canvas) {
            return;
        }
        const onResize = () => {
            if (canvasHeight && canvasHeight > 0) {
                const ratio = window.innerWidth / window.innerHeight;
                const height = Math.min(window.innerHeight, canvasHeight);
                canvas.height = height;
                canvas.width = height * ratio;
            } else if (canvasHeight === -2) {
                // "native" ... exactly match the browser/screen pixel density
                // this will be the highest possible quality, but your GPU
                // might struggle
                canvas.height = window.innerHeight * window.devicePixelRatio;
                canvas.width = window.innerWidth * window.devicePixelRatio;
            } else {
                // "auto" ... use the native browser pixel height for
                // resolution, but never pack more pixels into the canvas than
                // the actual screen pixels (ie if zoomed out or hiDPI)
                // quirk: zooming IN will lower the res, which is weird, if you
                // need to zoom in for some reason probably use "native"
                canvas.height = Math.min(window.innerHeight * window.devicePixelRatio, window.innerHeight);
                canvas.width = Math.min(window.innerWidth * window.devicePixelRatio, window.innerWidth);
            }
            console.info(`canvas size updated to ${canvas.width}x${canvas.height}`);
        };
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
    }, [canvas, canvasHeight]);

    return (
        <Unity
            ref={canvasRef}
            style={{ width: '100vw', height: '100vh', position: 'absolute' }}
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

export const useGlobalUnityInstance = ({ disabled }: { disabled?: boolean }) => {
    const [unity, setUnity] = useState<Partial<UnityContextHook>>({});
    const [ready, setReady] = useState<boolean>(false);

    const ctx = g.__globalUnityContext
        ? g.__globalUnityContext
        : ((): GlobalUnityContext => {
              return {
                  unity: makeUnityContextSubject(),
                  ready: makeUnityReadySubject(),
              };
          })();
    g.__globalUnityContext = ctx;

    if (!disabled) {
        if (typeof document !== 'undefined') {
            const mapContainer = document.getElementById('map-container');
            if (!mapContainer) {
                const mapContainer = document.createElement('div');
                mapContainer.id = 'map-container';
                document.body.appendChild(mapContainer);
                mapContainer.style.position = 'fixed';
                mapContainer.style.top = '0px';
                mapContainer.style.left = '0px';
                mapContainer.style.bottom = '0px';
                mapContainer.style.right = '0px';
                const root = createRoot(mapContainer);
                setTimeout(() => root.render(<UnityInstance />), 0); // do this async or react cries about nested renders
            }
        }
    }

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
    useEffect(() => {
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.style.display = 'block';
        }
        return () => {
            const mapContainer = document.getElementById('map-container');
            if (mapContainer) {
                mapContainer.style.display = 'none';
            }
        };
    }, []);

    return { unity, ready };
};
