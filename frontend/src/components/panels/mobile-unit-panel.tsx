import { formatNameOrId } from '@app/helpers';
import { useGameState } from '@app/hooks/use-game-state';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { MobileUnitInventory } from '@app/plugins/inventory/mobile-unit-inventory';
import { useCallback, useEffect, useState } from 'react';

export const MobileUnitPanel = () => {
    const { ready: mapReady, sendMessage } = useUnityMap();
    const { world, player, selectMobileUnit, selected } = useGameState();
    const { mobileUnit: selectedMobileUnit } = selected || {};
    const [isGracePeriod, setIsGracePeriod] = useState<boolean>(true);

    // TODO: remove this once the map refactor is done - it's only here to prevent clicking the select button before map is ready
    useEffect(() => {
        // arbitary time til until we show things like
        // the optional "jump to unit" button
        setTimeout(() => setIsGracePeriod(false), 10000);
    }, []);

    const selectAndFocusMobileUnit = useCallback(() => {
        if (!player) {
            return;
        }
        const mobileUnit = player.mobileUnits.find(() => true);
        if (!mobileUnit) {
            return;
        }
        if (!mapReady) {
            return;
        }
        if (!sendMessage) {
            return;
        }
        if (!selectMobileUnit) {
            return;
        }
        selectMobileUnit(mobileUnit.id);
        const tileId = mobileUnit.nextLocation?.tile.id;
        sendMessage('MapInteractionManager', 'FocusTile', tileId);
    }, [selectMobileUnit, player, sendMessage, mapReady]);

    const selectNextMobileUnit = useCallback(
        (n: number) => {
            if (!player) {
                return;
            }
            if (!selectMobileUnit) {
                return;
            }
            if (!selectedMobileUnit) {
                return;
            }
            if (player.mobileUnits.length === 0) {
                return;
            }
            const mobileUnitIndex = player.mobileUnits.map((s) => s.id).indexOf(selectedMobileUnit.id);
            const nextIndex =
                mobileUnitIndex + n > player.mobileUnits.length - 1
                    ? 0
                    : mobileUnitIndex + n < 0
                    ? player.mobileUnits.length - 1
                    : mobileUnitIndex + n;
            selectMobileUnit(player.mobileUnits[nextIndex].id);
        },
        [player, selectMobileUnit, selectedMobileUnit]
    );

    const nameEntity = useCallback(
        (entityId: string | undefined) => {
            if (!entityId) {
                return;
            }
            if (!player) {
                return;
            }
            const name = prompt('Enter a name:');
            if (!name || name.length < 3) {
                return;
            }
            if (name.length > 20) {
                alert('rejected: max 20 characters');
                return;
            }
            player
                .dispatch({ name: 'NAME_OWNED_ENTITY', args: [entityId, name] })
                .catch((err) => console.error('naming failed', err));
        },
        [player]
    );

    return (
        <>
            {!isGracePeriod && world && player && player.mobileUnits.length > 0 && !selectedMobileUnit && (
                <div className="onboarding" style={{ width: '30rem', background: 'transparent' }}>
                    <button onClick={selectAndFocusMobileUnit}>Select Unit</button>
                </div>
            )}
            {player && (
                <>
                    <div className="mobile-unit-actions">
                        {(!player || (player && player.mobileUnits.length > 0 && selectedMobileUnit)) && (
                            <div className="mobile-unit-selector">
                                <img src="/mobile-unit-yours.png" className="shield" alt="" />
                                <div className="controls">
                                    <button className="icon-button" onClick={() => selectNextMobileUnit(-1)}>
                                        <img src="/icons/prev.png" alt="Previous" />
                                    </button>
                                    <span className="label" onDoubleClick={() => nameEntity(selectedMobileUnit?.id)}>
                                        {formatNameOrId(selectedMobileUnit, 'Unit ')}
                                    </span>
                                    <button className="icon-button" onClick={() => selectNextMobileUnit(+1)}>
                                        <img src="/icons/next.png" alt="Next" />
                                    </button>
                                </div>
                            </div>
                        )}
                        {selectedMobileUnit && (
                            <MobileUnitInventory className="action" mobileUnit={selectedMobileUnit} />
                        )}
                    </div>
                </>
            )}
        </>
    );
};
