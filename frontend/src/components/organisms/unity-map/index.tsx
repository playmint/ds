/** @format */

import { FunctionComponent, useEffect, useState } from 'react';
import styled from 'styled-components';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './unity-map.styles';
import { DawnseekersClient, State } from '@app/contexts/dawnseekers-provider';
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
            return BigInt(value).toString(16); // Includes the '0x' prefix unlike node.js
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
        addEventListener('sendMessage', (msgJson: any) => {
            const msg = JSON.parse(msgJson) as Message;
            switch (msg.msg) {
                case 'dispatch': {
                    const dispatchMsg = msg as DispatchMessage;
                    const { action, args } = dispatchMsg as DispatchMessage;
                    const [moveAction, q, r, s] = args;
                    ds.dispatch(action, moveAction, q, r, s);
                    break;
                }
                case 'selectTile': {
                    const selectTileMsg = msg as SelectTileMessage;
                    ds.selectTiles(selectTileMsg.tileIDs);
                    break;
                }
            }
        });

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
