import { formatNameOrId } from '@app/helpers';
import { getTileCoordsFromId } from '@app/helpers/tile';
import { useGameState } from '@app/hooks/use-game-state';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { MobileUnitInventory } from '@app/plugins/inventory/mobile-unit-inventory';
import { useCallback, useMemo } from 'react';
import styled from 'styled-components';

const MobileUnitContainer = styled.div`
    display: flex;
    justify-content: flex-end;
    align-items: center;
    overflow: visible;
    min-height: 5rem;
    padding: 1rem;
    background: #143063;

    position: relative;
    width: 30rem;
    color: #fff;
    user-select: none;

    > .shield {
        position: absolute;
        left: 0.5rem;
        top: -2.5rem;
        width: 8rem;
    }

    > .controls {
        display: flex;
        flex-direction: row;
        width: 100%;
        margin-left: 7rem;

        .label {
            padding: 0 0.5rem;
            text-transform: uppercase;
            display: block;
            width: 100%;
            text-align: center;
            overflow: hidden;
        }
    }
`;

export const MobileUnitPanel = () => {
    const { ready: mapReady, sendMessage } = useUnityMap();
    const { world, player, selectMobileUnit, selected } = useGameState();
    const { mobileUnit: selectedMobileUnit } = selected || {};
    const playerUnits = useMemo(
        () => world?.mobileUnits.filter((mu) => mu.owner && player && mu.owner.id === player.id) || [],
        [world, player]
    );

    const selectAndFocusMobileUnit = useCallback(() => {
        if (playerUnits.length === 0) {
            return;
        }
        const mobileUnit = playerUnits.find(() => true);
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
        if (!tileId) {
            return;
        }
        const [q, r, s] = getTileCoordsFromId(tileId);
        sendMessage('MapCamera', 'FocusTile', JSON.stringify({ q, r, s }));
    }, [selectMobileUnit, playerUnits, sendMessage, mapReady]);

    const selectNextMobileUnit = useCallback(
        (n: number) => {
            if (playerUnits.length === 0) {
                return;
            }
            if (!selectMobileUnit) {
                return;
            }
            if (!selectedMobileUnit) {
                return;
            }
            if (playerUnits.length === 0) {
                return;
            }
            const mobileUnitIndex = playerUnits.map((s) => s.id).indexOf(selectedMobileUnit.id);
            const nextIndex =
                mobileUnitIndex + n > playerUnits.length - 1
                    ? 0
                    : mobileUnitIndex + n < 0
                    ? playerUnits.length - 1
                    : mobileUnitIndex + n;
            selectMobileUnit(playerUnits[nextIndex].id);
        },
        [playerUnits, selectMobileUnit, selectedMobileUnit]
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
            {mapReady && world && player && playerUnits.length > 0 && !selectedMobileUnit && (
                <div className="onboarding" style={{ width: '30rem', background: 'transparent' }}>
                    <button onClick={selectAndFocusMobileUnit}>Select Unit</button>
                </div>
            )}
            {player && (
                <>
                    <div className="mobile-unit-actions">
                        {(!player || (player && playerUnits.length > 0 && selectedMobileUnit)) && (
                            <MobileUnitContainer>
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
                            </MobileUnitContainer>
                        )}
                        {selectedMobileUnit && (
                            <MobileUnitInventory mobileUnit={selectedMobileUnit} bags={world?.bags || []} />
                        )}
                    </div>
                </>
            )}
        </>
    );
};
