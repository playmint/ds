import { ActionName } from '@app/../../core/src';
import { sleep } from '@app/helpers/sleep';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo } from 'react';
import { pipe, subscribe } from 'wonka';
import { useGameState } from './use-game-state';
import { useGlobalUnityInstance, UnityMessage, SendMessageFunc } from './use-unity-instance';

// @refresh reset
export const disableFastRefresh = 'this export only exists to disable fast-refresh of this file';

interface DispatchMessage extends UnityMessage {
    action: string;
    args: any[];
}

interface SelectTileMessage extends UnityMessage {
    tileIDs: string[];
}

interface SetIntentMessage extends UnityMessage {
    intent: string;
}

interface SetMobileUnitMessage extends UnityMessage {
    mobileUnitID: string;
}

interface SetMapElementMessage extends UnityMessage {
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

export interface UnityMapContextValue {
    ready?: boolean;
    sendMessage?: SendMessageFunc;
}

export const UnityMapContext = createContext<UnityMapContextValue>({});
export const useUnityMap = () => useContext(UnityMapContext);

export const UnityMapProvider = ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => {
    const { unity, ready, messages } = useGlobalUnityInstance();
    const { sendMessage, loadingProgression } = unity;
    const {
        selectTiles,
        selectMapElement,
        selectIntent: rawSelectIntent,
        selectMobileUnit,
        selected,
        world,
        player,
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
        (msgObj: UnityMessage) => {
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
        if (disabled) {
            return;
        }
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

                    if (args.length < 3) {
                        return;
                    }

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
    }, [sendMessage, ready, disabled]);

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
        if (!selected) {
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
