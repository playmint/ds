// @refresh reset
import { ActionName } from '@app/../../core/src';
import { sleep } from '@app/helpers/sleep';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { pipe, subscribe } from 'wonka';
import { useGameState } from './use-game-state';
import { useGlobalUnityInstance, UnityMessage, SendMessageFunc } from './use-unity-instance';

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

// controling how we chunk up the state JSON
const CHUNK_TILES = 50;
const CHUNK_PLAYERS = 100;
const CHUNK_BUILDINGS = 50;

// queue of state to send
interface PendingState {
    player?: any;
    players?: any;
    tiles?: any;
    buildings?: any;
    block?: any;
    selection?: any;
}

// ---

export interface UnityMapContextValue {
    ready?: boolean;
    sendMessage?: SendMessageFunc;
}

export const UnityMapContext = createContext<UnityMapContextValue>({});
export const useUnityMap = () => useContext(UnityMapContext);

export const UnityMapProvider = ({ children, disabled }: { children: ReactNode; disabled?: boolean }) => {
    const [pending, setPendingState] = useState<PendingState>({});
    const [isSending, setIsSending] = useState<boolean>(false);
    const { unity, ready, messages } = useGlobalUnityInstance();
    const { sendMessage, loadingProgression } = unity;
    const { selectTiles, selectMapElement, selectIntent, selectMobileUnit, selected, world, player } = useGameState();

    const { dispatch } = player || {};
    const loadingPercentage = loadingProgression ? Math.round(loadingProgression * 100) : 0;

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
                    if (selectTiles) {
                        selectTiles([]);
                    }
                    if (selectIntent) {
                        selectIntent(intent);
                    }
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
        if (isSending) {
            return;
        }
        if (!pending.players && !pending.tiles && !pending.player && !pending.selection && !pending.buildings) {
            return;
        }
        setIsSending(true);
        (async () => {
            let args: any[] = [];

            args.push([
                'GameStateMediator',
                'StartOnState',
                JSON.stringify({ tiles: [], buildings: [], players: [], block: pending.block }),
            ]);

            if (pending.player) {
                args = [...args, pending.player];
            }
            if (pending.selection) {
                args = [...args, pending.selection];
            }
            if (pending.players) {
                args = [...args, ...pending.players];
            }
            if (pending.tiles) {
                args = [...args, ...pending.tiles];
            }
            if (pending.buildings) {
                args = [...args, ...pending.buildings];
            }
            if (pending.player) {
                args.push(pending.player);
            }
            setPendingState((pending) => {
                pending.player = null;
                pending.players = null;
                pending.tiles = null;
                pending.buildings = null;
                pending.block = null;
                pending.selection = null;
                return { ...pending };
            });
            args.push(['GameStateMediator', 'EndOnState']);

            if (args.length < 3) {
                return;
            }

            for (let i = 0; i < args.length; i++) {
                sendMessage.apply(sendMessage, args[i]);
                await sleep(0);
            }
        })()
            .catch((err) => console.error('sendMessage', err))
            .finally(() => setIsSending(false));
    }, [sendMessage, ready, disabled, isSending, pending]);

    const { players, buildings, tiles, block } = world || {};
    useEffect(() => {
        if (!ready) {
            return;
        }
        if (players) {
            setPendingState((pending) => {
                pending.players = [['GameStateMediator', 'ResetWorldPlayers']];
                for (let i = 0; i < players.length; i += CHUNK_PLAYERS) {
                    pending.players.push([
                        'GameStateMediator',
                        'AddWorldPlayers',
                        JSON.stringify(players.slice(i, i + CHUNK_PLAYERS)),
                    ]);
                }
                return { ...pending };
            });
        }

        if (tiles) {
            setPendingState((pending) => {
                pending.tiles = [['GameStateMediator', 'ResetWorldTiles']];
                for (let i = 0; i < tiles.length; i += CHUNK_TILES) {
                    pending.tiles.push([
                        'GameStateMediator',
                        'AddWorldTiles',
                        JSON.stringify(tiles.slice(i, i + CHUNK_TILES)),
                    ]);
                }
                return { ...pending };
            });
        }

        if (buildings) {
            setPendingState((pending) => {
                pending.buildings = [['GameStateMediator', 'ResetWorldBuildings']];
                for (let i = 0; i < buildings.length; i += CHUNK_BUILDINGS) {
                    pending.buildings.push([
                        'GameStateMediator',
                        'AddWorldBuildings',
                        JSON.stringify(buildings.slice(i, i + CHUNK_BUILDINGS)),
                    ]);
                }
                return { ...pending };
            });
        }

        setPendingState((pending) => {
            pending.block = block;
            return pending;
        });
    }, [ready, players, tiles, buildings, block]);

    useEffect(() => {
        if (!ready) {
            return;
        }
        // FIXME: map should allow setting player to null but currently explodes
        if (!player) {
            return;
        }
        setPendingState((pending) => {
            pending.player = ['GameStateMediator', 'SetPlayer', JSON.stringify(player)];
            return { ...pending };
        });
    }, [ready, player]);

    useEffect(() => {
        if (!ready) {
            return;
        }
        if (!selected) {
            return;
        }
        setPendingState((pending) => {
            pending.selection = ['GameStateMediator', 'SetSelectionState', JSON.stringify(selected || {})];
            return { ...pending };
        });
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
