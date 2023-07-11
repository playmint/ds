/** @format */

import { ComponentProps } from '@app/types/component-props';
import { SelectionSelectors } from '@downstream/core';
import { FunctionComponent, useEffect, useRef, useState } from 'react';
import { Unity } from 'react-unity-webgl';
import { UnityProvider } from 'react-unity-webgl/distribution/types/unity-provider';
import styled from 'styled-components';
import { styles } from './unity-map.styles';

export interface UnityMapProps extends ComponentProps, Partial<SelectionSelectors> {
    unityProvider: UnityProvider;
    sendMessage: (gameObjectName: string, methodName: string, parameter?: any) => void;
}

const StyledUnityMap = styled('div')`
    ${styles}
`;

export const UnityMap: FunctionComponent<UnityMapProps> = ({
    unityProvider,
    sendMessage,
    ...otherProps
}: UnityMapProps) => {
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
                    metaKey: false
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
