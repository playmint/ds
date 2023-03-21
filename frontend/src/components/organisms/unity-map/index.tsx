/** @format */

import { FunctionComponent, useEffect, useState } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './unity-map.styles';
import { Client as DawnseekersClient, State } from '@core';
import { Unity, useUnityContext } from 'react-unity-webgl';

export interface UnityMapProps extends ComponentProps {
    state: State;
    ds: DawnseekersClient;
}

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

// TODO: Probably a more efficient way of doing this. Find an NPM package that does cloning with circular refs
const breakCircularReferences = (obj: any, ancestorSet?: any[]) => {
    const seen: any[] = [];
    if (ancestorSet) {
        seen.push(...ancestorSet);
    }

    if (seen.indexOf(obj) > -1) {
        return null;
    }

    seen.push(obj);

    const newObj = Array.isArray(obj) ? [] : {};

    for (const key in obj) {
        const value = obj[key];
        if (typeof value === 'object' && value !== null) {
            const newVal = breakCircularReferences(value, seen);
            if (newVal !== null) {
                newObj[key] = newVal;
            }
        } else {
            newObj[key] = obj[key];
        }
    }

    return newObj;
};

export const UnityMap: FunctionComponent<UnityMapProps> = (props: UnityMapProps) => {
    const { state, ds, ...otherProps } = props;
    const { unityProvider, sendMessage, addEventListener } = useUnityContext({
        loaderUrl: `/ds-unity/Build/ds-unity.loader.js`,
        dataUrl: `/ds-unity/Build/ds-unity.data`,
        frameworkUrl: `/ds-unity/Build/ds-unity.framework.js`,
        codeUrl: `/ds-unity/Build/ds-unity.wasm`
    });
    const [isReady, setIsReady] = useState(false);
    const [prevStateJson, setPrevStateJson] = useState('');

    // TODO: Doing this on every re-render probably bad and slow. Comparing the latest
    // state object with a cached reference always evalated false when doing `state === prevState`.
    const stateJson = JSON.stringify(breakCircularReferences(state), (_, value) => {
        if (typeof value === 'bigint') {
            return BigInt(value).toString(16); // Includes '0x' prefix
        }
        return value;
    });

    // -- State update

    useEffect(() => {
        if (!isReady || !stateJson || prevStateJson === stateJson) return;

        sendMessage('COG', 'OnState', stateJson);
        setPrevStateJson(stateJson);
    }, [isReady, stateJson, prevStateJson, sendMessage]);

    // -- Event handling

    useEffect(() => {
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
                    ds.dispatch(action, ...args).catch((e) => {
                        console.error(e);
                    });
                    break;
                }
                case 'selectTiles': {
                    const { tileIDs } = msgObj as SelectTileMessage;
                    ds.selectTiles(tileIDs).catch((e) => {
                        console.error(e);
                    });
                    break;
                }
                case 'setIntent': {
                    const { intent } = msgObj as SetIntentMessage;
                    ds.setIntent(intent).catch((e) => {
                        console.error(e);
                    });
                    break;
                }
                case 'cancelIntent': {
                    ds.cancelIntent().catch((e) => {
                        console.error(e);
                    });
                    break;
                }
            }
        };

        addEventListener('sendMessage', processMessage);
        addEventListener('unityReady', () => {
            setIsReady(true);
        });
    }, [ds, addEventListener]);

    return (
        <StyledUnityMap {...otherProps}>
            <Unity unityProvider={unityProvider} />
        </StyledUnityMap>
    );
};
