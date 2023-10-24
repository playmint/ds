import { formatNameOrId } from '@app/helpers';
import { getTileCoordsFromId } from '@app/helpers/tile';
import { useGameState } from '@app/hooks/use-game-state';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { MobileUnitInventory } from '@app/plugins/inventory/mobile-unit-inventory';
import { useCallback, useMemo } from 'react';
import { BasePanelStyles } from '@app/styles/base-panel.styles';
import { TextButton } from '@app/styles/button.styles';
import styled from 'styled-components';
import { colors } from '@app/styles/colors';

const StyledMobileUnitIcon = styled.div`
    --width: 6.4rem;
    width: var(--width);
    height: calc(var(--width) * 1.3);
    background: ${colors.grey_5};

    mask-image: url('/icons/selectedFilled.svg');
    mask-size: 100%;
    mask-position: center;
    mask-repeat: no-repeat;

    > .inner {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -57%);
        width: 89%;
        height: 100%;
        background: ${colors.orange_0};
        mask-image: url('/icons/HexBadge_Icons.svg');
        mask-size: 100%;
        mask-position: center;
        mask-repeat: no-repeat;

        > .icon {
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            width: 50%;
            height: 50%;
            background: white;
            mask-image: url('/icons/UnitIcon.svg');
            mask-size: 100%;
            mask-position: center;
            mask-repeat: no-repeat;
        }
    }
`;

const MobileUnitIcon = ({ className, onClick }) => {
    return (
        <StyledMobileUnitIcon className={className} onClick={onClick}>
            <div className="inner">
                <div className="icon" />
            </div>
        </StyledMobileUnitIcon>
    );
};

const StyledMobileUnitPanel = styled.div`
    ${BasePanelStyles}
    margin-top: 3.5rem;

    .bags > div:last-child .slots {
        margin-bottom: 0;
    }
`;

const MobileUnitContainer = styled.div`
    overflow: visible;
    min-height: 5rem;
    margin-top: 3rem;

    position: relative;

    user-select: none;

    > .unitIcon {
        position: absolute;
        cursor: pointer;
        left: 0rem;
        top: -8.2rem;
    }

    > .label {
        font-size: 2.8rem;
        display: block;
        width: 100%;

        overflow: hidden;
        font-weight: 800;

        > .hashTag {
            color: ${colors.orange_0};
        }
    }

    > .location {
        margin-bottom: 0.5rem;
        color: ${colors.grey_3};
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

    // const selectNextMobileUnit = useCallback(
    //     (n: number) => {
    //         if (playerUnits.length === 0) {
    //             return;
    //         }
    //         if (!selectMobileUnit) {
    //             return;
    //         }
    //         if (!selectedMobileUnit) {
    //             return;
    //         }
    //         if (playerUnits.length === 0) {
    //             return;
    //         }
    //         const mobileUnitIndex = playerUnits.map((s) => s.id).indexOf(selectedMobileUnit.id);
    //         const nextIndex =
    //             mobileUnitIndex + n > playerUnits.length - 1
    //                 ? 0
    //                 : mobileUnitIndex + n < 0
    //                 ? playerUnits.length - 1
    //                 : mobileUnitIndex + n;
    //         selectMobileUnit(playerUnits[nextIndex].id);
    //     },
    //     [playerUnits, selectMobileUnit, selectedMobileUnit]
    // );

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
            {mapReady &&
                world &&
                player &&
                playerUnits.length > 0 &&
                (selectedMobileUnit ? (
                    <StyledMobileUnitPanel>
                        <div className="mobile-unit-actions">
                            <MobileUnitContainer>
                                <MobileUnitIcon className="unitIcon" onClick={selectAndFocusMobileUnit} />
                                <span className="label" onDoubleClick={() => nameEntity(selectedMobileUnit?.id)}>
                                    <span className="hashTag">#</span>
                                    {formatNameOrId(selectedMobileUnit, 'unit')}
                                </span>
                                {selectedMobileUnit.nextLocation?.tile && (
                                    <div className="location">
                                        {getTileCoordsFromId(selectedMobileUnit.nextLocation.tile.id).join(' ')}
                                    </div>
                                )}
                            </MobileUnitContainer>
                            <MobileUnitInventory mobileUnit={selectedMobileUnit} bags={world?.bags || []} />
                        </div>
                    </StyledMobileUnitPanel>
                ) : (
                    <TextButton onClick={selectAndFocusMobileUnit}>Select Unit</TextButton>
                ))}
        </>
    );
};
