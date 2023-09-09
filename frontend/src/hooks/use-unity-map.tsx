import { ActionName, useGameState } from '@app/../../core/src';
import { sleep } from '@app/helpers/sleep';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Unity, useUnityContext } from 'react-unity-webgl';
import { UnityContextHook } from 'react-unity-webgl/distribution/types/unity-context-hook';
import { concat, fromValue, lazy, makeSubject, pipe, Subject, subscribe, tap } from 'wonka';

interface Message {
    msg: string;
}

type SendMessageFunc = (...args: any[]) => void;

interface GlobalUnityContext {
    messages: Subject<Message>;
    ready: Subject<boolean>;
    unity: Subject<Partial<UnityContextHook>>;
}

const g = globalThis as unknown as { __globalUnityContext: GlobalUnityContext };

interface DispatchMessage extends Message {
    action: string;
    args: any[];
}

interface SelectTileMessage extends Message {
    tileIDs: string[];
}

interface SetIntentMessage extends Message {
    intent: string;
}

interface SetMobileUnitMessage extends Message {
    mobileUnitID: string;
}

interface SetMapElementMessage extends Message {
    mapElementID: string;
}

// caching previous state sends
let prevPlayerJSON: string | undefined;
let prevPlayersJSON: string | undefined;
let prevTilesJSON: string | undefined;
let prevBuildingsJSON: string | undefined;
let prevSelectionJSON: string | undefined;

// controling how we chunk up the state JSON
const CHUNK_TILES = 50;
const CHUNK_PLAYERS = 100;
const CHUNK_BUILDINGS = 50;

// queue of state to send
let isSending = false;
let pendingPlayer: any;
let pendingPlayers: any;
let pendingTiles: any;
let pendingBuildings: any;
let pendingBlock: any;
let pendingSelection: any;
let hasSentAtLeastOneTilesUpdate = false;

// ---

// [!] THIS COMPONENT IS RENDERED OUT OF THE MAIN REACT ROOT To avoid the fatal
// issues that occur if the unity app gets even the slightest feeling that it
// might get unloaded. we render the react canvas exactly once out of tree and
// never again, this is weird, but significantly more stable than attempt to
// handle react unmounting/remounting, esspecially when with hot reloading
const UnityMap = () => {
    const canvasRef = useRef(null);
    const [devicePixelRatio, setDevicePixelRatio] = useState(window.devicePixelRatio);
    const unity = useUnityContext({
        loaderUrl: `/ds-unity/Build/ds-unity.loader.js`,
        dataUrl: `/ds-unity/Build/ds-unity.data`,
        frameworkUrl: `/ds-unity/Build/ds-unity.framework.js`,
        codeUrl: `/ds-unity/Build/ds-unity.wasm`,
        streamingAssetsUrl: `/ds-unity/StreamingAssets/`,
        companyName: `Playmint`,
        productName: `Downstream`,
        productVersion: `blueprint`,
    });
    const { unityProvider, loadingProgression, addEventListener, removeEventListener, sendMessage } = unity;

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
        // A function which will update the device pixel ratio of the Unity
        // Application to match the device pixel ratio of the browser.
        const updateDevicePixelRatio = function () {
            setDevicePixelRatio(window.devicePixelRatio);
        };
        // A media matcher which watches for changes in the device pixel ratio.
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
        mediaMatcher.addEventListener('change', updateDevicePixelRatio);
        return function () {
            if (!mediaMatcher.addEventListener) {
                return;
            }
            // Removing the event listener when the component unmounts.
            mediaMatcher.removeEventListener('change', updateDevicePixelRatio);
        };
    }, [devicePixelRatio]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (typeof window === 'undefined') {
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
        };
    }, []);

    useEffect(() => {
        if (!addEventListener || !removeEventListener) {
            return;
        }

        const onReady = () => {
            g.__globalUnityContext.ready.next(true);
        };

        const onMessage = (msgJson: string) => {
            let msgObj: Message;
            try {
                msgObj = JSON.parse(msgJson) as Message;
            } catch (err) {
                console.error(`unitymap: onMessage: ${err}`);
                return;
            }
            g.__globalUnityContext.messages.next(msgObj);
        };

        addEventListener('sendMessage', onMessage);
        addEventListener('unityReady', onReady);

        return () => {
            removeEventListener('sendMessage', onMessage);
            removeEventListener('unityReady', onReady);
        };
    }, [addEventListener, removeEventListener]);

    return (
        <Unity
            ref={canvasRef}
            style={{ width: '100vw', height: '100vh', position: 'absolute' }}
            unityProvider={unityProvider}
            devicePixelRatio={devicePixelRatio}
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

const makeUnityMessagesSubject = () => {
    return makeSubject<Message>();
};

const useGlobalUnityMapContext = () => {
    const [unity, setUnity] = useState<Partial<UnityContextHook>>({});
    const [ready, setReady] = useState<boolean>(false);

    const ctx = g.__globalUnityContext
        ? g.__globalUnityContext
        : ((): GlobalUnityContext => {
              return {
                  unity: makeUnityContextSubject(),
                  messages: makeUnityMessagesSubject(),
                  ready: makeUnityReadySubject(),
              };
          })();
    g.__globalUnityContext = ctx;

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
        setTimeout(() => root.render(<UnityMap />), 0); // do this async or react cries about nested renders
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

    return { unity, ready, messages: ctx.messages.source };
};

// ---

export interface UnityMapContextValue {
    ready?: boolean;
    sendMessage?: SendMessageFunc;
}

export const UnityMapContext = createContext<UnityMapContextValue>({});
export const useUnityMap = () => useContext(UnityMapContext);

export const UnityMapProvider = ({ children }: { children: ReactNode }) => {
    const { unity, ready, messages } = useGlobalUnityMapContext();
    const { sendMessage, loadingProgression } = unity;
    const {
        world,
        player,
        selectMobileUnit,
        selectMapElement,
        selectTiles,
        selected,
        selectIntent: rawSelectIntent,
    } = useGameState();
    const { dispatch } = player || {};
    const loadingPercentage = loadingProgression ? Math.round(loadingProgression * 100) : 0;

    const selectIntent = useCallback(
        (intent: string | undefined, tileId?: string) => {
            if (!selectTiles) {
                return;
            }
            if (!rawSelectIntent) {
                return;
            }
            selectTiles(tileId ? [tileId] : []);
            rawSelectIntent(intent);
        },
        [selectTiles, rawSelectIntent]
    );

    const processMessage = useCallback(
        (msgObj: Message) => {
            switch (msgObj.msg) {
                case 'dispatch': {
                    const { action, args } = msgObj as DispatchMessage;
                    if (!dispatch) {
                        console.warn('map attempted to dispatch when there was no player to dispatch with');
                        return;
                    }
                    dispatch({ name: action as ActionName, args }).catch((err) =>
                        console.error('dispatch from map failed', err)
                    );
                    break;
                }
                case 'selectTiles': {
                    const { tileIDs } = msgObj as SelectTileMessage;
                    if (!selectTiles) {
                        return;
                    }
                    selectTiles(tileIDs);
                    break;
                }
                case 'setIntent': {
                    const { intent } = msgObj as SetIntentMessage;
                    selectIntent(intent);
                    break;
                }
                case 'selectMobileUnit': {
                    const { mobileUnitID } = msgObj as SetMobileUnitMessage;
                    if (!selectMobileUnit) {
                        return;
                    }
                    selectMobileUnit(mobileUnitID);
                    break;
                }
                case 'selectMapElement': {
                    const { mapElementID } = msgObj as SetMapElementMessage;
                    if (!selectMapElement) {
                        return;
                    }
                    selectMapElement(mapElementID);
                    break;
                }
                default: {
                    console.warn('unhandled message from map:', msgObj);
                }
            }
        },
        [dispatch, selectTiles, selectIntent, selectMobileUnit, selectMapElement]
    );

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

    useEffect(() => {
        if (!sendMessage) {
            return;
        }
        if (!ready) {
            return;
        }
        const timer = setInterval(() => {
            if (isSending) {
                return;
            }
            if (!pendingPlayers && !pendingTiles && !pendingPlayer && !pendingSelection && !pendingBuildings) {
                return;
            }
            isSending = true;
            (async () => {
                try {
                    let args: any[] = [];

                    args.push([
                        'GameStateMediator',
                        'StartOnState',
                        JSON.stringify({ tiles: [], buildings: [], players: [], block: pendingBlock }),
                    ]);

                    // if there is a selection change pending,
                    // then give it priority over the world state
                    // so that the UI feels snappier.
                    // any other updates will occur in the next loop
                    if (pendingSelection && hasSentAtLeastOneTilesUpdate) {
                        if (pendingPlayer) {
                            args.push(pendingPlayer);
                        }
                        args.push(pendingSelection);
                        pendingPlayer = null;
                        pendingSelection = null;
                    } else {
                        if (pendingPlayers) {
                            args = [...args, ...pendingPlayers];
                        }
                        if (pendingTiles) {
                            hasSentAtLeastOneTilesUpdate = true;
                            args = [...args, ...pendingTiles];
                        }
                        if (pendingBuildings) {
                            args = [...args, ...pendingBuildings];
                        }
                        if (pendingPlayer) {
                            args.push(pendingPlayer);
                        }
                        pendingPlayer = null;
                        pendingPlayers = null;
                        pendingTiles = null;
                        pendingBuildings = null;
                        pendingBlock = null;
                    }
                    args.push(['GameStateMediator', 'EndOnState']);

                    for (let i = 0; i < args.length; i++) {
                        sendMessage.apply(sendMessage, args[i]);
                        await sleep(0);
                    }
                } finally {
                    isSending = false;
                }
            })().catch((err) => console.error('SendMessage', err));
        }, 25);
        return () => {
            clearInterval(timer);
        };
    }, [sendMessage, ready]);

    const { players, buildings, tiles, block } = world || {};
    useEffect(() => {
        if (!ready) {
            return;
        }
        if (players) {
            const nextPlayersJSON = JSON.stringify(players);
            if (nextPlayersJSON != prevPlayersJSON) {
                pendingPlayers = [['GameStateMediator', 'ResetWorldPlayers']];
                for (let i = 0; i < players.length; i += CHUNK_PLAYERS) {
                    pendingPlayers.push([
                        'GameStateMediator',
                        'AddWorldPlayers',
                        JSON.stringify(players.slice(i, i + CHUNK_PLAYERS)),
                    ]);
                }
                prevPlayersJSON = nextPlayersJSON;
            }
        }

        if (tiles) {
            const nextTilesJSON = JSON.stringify(tiles);
            if (nextTilesJSON != prevTilesJSON) {
                pendingTiles = [['GameStateMediator', 'ResetWorldTiles']];
                for (let i = 0; i < tiles.length; i += CHUNK_TILES) {
                    pendingTiles.push([
                        'GameStateMediator',
                        'AddWorldTiles',
                        JSON.stringify(tiles.slice(i, i + CHUNK_TILES)),
                    ]);
                }
                prevTilesJSON = nextTilesJSON;
            }
        }

        if (buildings) {
            const nextBuildingsJSON = JSON.stringify(buildings);
            if (nextBuildingsJSON != prevBuildingsJSON) {
                pendingBuildings = [['GameStateMediator', 'ResetWorldBuildings']];
                for (let i = 0; i < buildings.length; i += CHUNK_BUILDINGS) {
                    pendingBuildings.push([
                        'GameStateMediator',
                        'AddWorldBuildings',
                        JSON.stringify(buildings.slice(i, i + CHUNK_BUILDINGS)),
                    ]);
                }
                prevBuildingsJSON = nextBuildingsJSON;
            }
        }

        pendingBlock = block;
    }, [ready, players, tiles, buildings, block]);

    useEffect(() => {
        if (!ready) {
            return;
        }
        // FIXME: map should allow setting player to null but currently explodes
        if (!player) {
            return;
        }
        const nextPlayerJSON = JSON.stringify(player);
        if (nextPlayerJSON != prevPlayerJSON) {
            pendingPlayer = ['GameStateMediator', 'SetPlayer', nextPlayerJSON];
            prevPlayerJSON = nextPlayerJSON;
        }
    }, [ready, player]);

    useEffect(() => {
        if (!ready) {
            return;
        }
        const nextSelectionJSON = JSON.stringify(selected || {});
        if (nextSelectionJSON != prevSelectionJSON) {
            pendingSelection = ['GameStateMediator', 'SetSelectionState', nextSelectionJSON];
            prevSelectionJSON = nextSelectionJSON;
        }
    }, [ready, selected]);

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
