/** @format */

import { ComponentProps } from '@app/types/component-props';
import { SelectionSelectors } from '@downstream/core';
import { FunctionComponent, useEffect, useRef, useState } from 'react';
import { Unity, useUnityContext } from 'react-unity-webgl';
import { UnityProvider } from 'react-unity-webgl/distribution/types/unity-provider';
import styled from 'styled-components';
import { styles } from './unity-map.styles';

export interface UnityMapProps extends ComponentProps, Partial<SelectionSelectors> {
    unityProvider: UnityProvider;
}

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

const StyledUnityMap = styled('div')`
    ${styles}
`;

export const UnityMap: FunctionComponent<UnityMapProps> = ({ unityProvider, ...otherProps }: UnityMapProps) => {
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
        </StyledUnityMap>
    );
};
