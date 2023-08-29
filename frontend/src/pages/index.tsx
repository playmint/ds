/** @format */
import { trackEvent } from '@app/components/organisms/analytics';
import { useUnityMap } from '@app/components/organisms/unity-map';
import Shell from '@app/components/views/shell';
import { useBlock, useGameState, useWallet } from '@downstream/core';
import { useCallback, useEffect, useState } from 'react';
import { pipe, subscribe } from 'wonka';

export default function ShellPage() {
    const { wallet, selectProvider } = useWallet();
    const {
        world,
        player,
        selected,
        selectMobileUnit,
        selectTiles,
        selectIntent: rawSelectIntent,
        selectMapElement,
    } = useGameState();
    const blockNumber = useBlock();
    const [isReady, setIsReady] = useState(false);
    const { unityProvider, sendMessage, addEventListener, removeEventListener, loadingProgression } = useUnityMap();

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

    useEffect(() => {
        if (!addEventListener || !removeEventListener) {
            return;
        }

        const processReady = () => {
            console.log('process ready');
            setIsReady(true);
        };

        console.log('process listening');
        addEventListener('unityReady', processReady);

        return () => {
            removeEventListener('unityReady', processReady);
            setIsReady(false);
            console.log('unmounting');
        };
    }, [addEventListener, removeEventListener]);

    // collect client dispatch analytics
    useEffect(() => {
        if (!player) {
            return;
        }
        const { unsubscribe } = pipe(
            player.dispatched,
            subscribe((event) => event.actions.map((action) => trackEvent('dispatch', { action: action.name })))
        );
        return unsubscribe;
    }, [player]);

    // We'll round the loading progression to a whole number to represent the
    // percentage of the Unity Application that has loaded.
    const loadingPercentage = Math.round(loadingProgression * 100);
    const loading = loadingPercentage < 100 && (
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
    );

    return (
        <>
            {loading}
            <Shell
                mapReady={isReady}
                world={world}
                player={player}
                selection={selected}
                selectMobileUnit={selectMobileUnit}
                selectTiles={selectTiles}
                selectIntent={selectIntent}
                selectMapElement={selectMapElement}
                unityProvider={unityProvider}
                sendMessage={sendMessage}
                selectProvider={selectProvider}
                wallet={wallet}
                blockNumber={blockNumber}
                addUnityEventListener={addEventListener}
                removeUnityEventListener={removeEventListener}
            />
        </>
    );
}
