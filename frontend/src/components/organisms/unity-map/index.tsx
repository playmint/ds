/** @format */

import { dangerouslyHackStateForMap } from '@app/components/views/shell/maphack';
import { ComponentProps } from '@app/types/component-props';
import { usePlayer, useSelection, useWorld } from '@dawnseekers/core';
import { FunctionComponent, useEffect, useState } from 'react';
import { Unity, useUnityContext } from 'react-unity-webgl';
import styled from 'styled-components';
import { styles } from './unity-map.styles';

export interface UnityMapProps extends ComponentProps {}

interface Message {
    msg: string;
}

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

const StyledUnityMap = styled('div')`
    ${styles}
`;

let globalSender: any;
let globalDrainTimeout: any;
const globalQueue: string[] = [];
function drainOne() {
    try {
        if (globalQueue.length == 0) {
            return;
        }
        if (!globalSender) {
            return;
        }
        const blob = globalQueue.shift();
        if (!blob) {
            return;
        }
        const args = ['COG', 'OnState', blob];
        globalSender(...args);
        console.log(`UnityMap: drained one, ${globalQueue.length} remaining`);
    } catch (err) {
        console.error('UnityMap: sendMessage', err);
    } finally {
        globalDrainTimeout = setTimeout(drainOne, 50);
    }
}

export const UnityMap: FunctionComponent<UnityMapProps> = ({ ...otherProps }: UnityMapProps) => {
    const player = usePlayer();
    const { dispatch } = player || {};
    const world = useWorld();
    const { seeker: selectedSeeker, tiles: selectedTiles, intent } = useSelection();
    const { selectTiles, selectIntent } = useSelection();
    const { unityProvider, sendMessage, addEventListener, removeEventListener } = useUnityContext({
        loaderUrl: `/ds-unity/Build/ds-unity.loader.js`,
        dataUrl: `/ds-unity/Build/ds-unity.data`,
        frameworkUrl: `/ds-unity/Build/ds-unity.framework.js`,
        codeUrl: `/ds-unity/Build/ds-unity.wasm`
    });
    const [isReady, setIsReady] = useState(false);

    // -- State update

    // [!] hack to munge the new world state shape into a shape the map wants
    //     TODO: update the map to accept the new shape of the world
    useEffect(() => {
        if (!globalDrainTimeout) {
            globalDrainTimeout = setTimeout(drainOne, 1000);
        }
        return () => {
            clearTimeout(globalDrainTimeout);
            globalDrainTimeout = null;
        };
    }, []);
    if (isReady) {
        globalSender = sendMessage;
        const newMapState = dangerouslyHackStateForMap(world, player, selectedSeeker, selectedTiles, intent);
        globalQueue.push(JSON.stringify(newMapState));
    }

    // -- Event handling

    useEffect(() => {
        if (!addEventListener || !removeEventListener) {
            return;
        }
        // Export this code so it's used both here and the bridge
        const processMessage = (msgJson: any) => {
            let msgObj: Message;
            try {
                msgObj = JSON.parse(msgJson) as Message;
            } catch (e) {
                console.error(e);
                return;
            }

            switch (msgObj.msg) {
                case 'dispatch': {
                    const { action, args } = msgObj as DispatchMessage;
                    if (!dispatch) {
                        console.warn('map attempted to dispatch when there was no player to dispatch with');
                        return;
                    }
                    dispatch({ name: action, args });
                    break;
                }
                case 'selectTiles': {
                    const { tileIDs } = msgObj as SelectTileMessage;
                    selectTiles(tileIDs);
                    break;
                }
                case 'setIntent': {
                    const { intent } = msgObj as SetIntentMessage;
                    selectIntent(intent);
                    break;
                }
            }
        };

        const processReady = () => {
            setIsReady(true);
        };

        addEventListener('sendMessage', processMessage);
        addEventListener('unityReady', processReady);

        return () => {
            removeEventListener('sendMessage', processMessage);
            removeEventListener('unityReady', processReady);
        };
    }, [dispatch, selectTiles, selectIntent, addEventListener, removeEventListener]);

    return (
        <StyledUnityMap {...otherProps}>
            <Unity unityProvider={unityProvider} />
        </StyledUnityMap>
    );
};
