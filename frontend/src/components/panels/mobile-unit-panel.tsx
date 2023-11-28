import { formatNameOrId } from '@app/helpers';
import { getTileCoordsFromId } from '@app/helpers/tile';
import { useGameState } from '@app/hooks/use-game-state';
import { useUnityMap } from '@app/hooks/use-unity-map';
import { getMobileUnitStats } from '@app/plugins/combat/helpers';
import { MobileUnitInventory } from '@app/plugins/inventory/mobile-unit-inventory';
import { StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { TextButton } from '@app/styles/button.styles';
import { colorMap, colors } from '@app/styles/colors';
import { CompoundKeyEncoder, NodeSelectors } from '@downstream/core';
import { getBagsAtEquipee } from '@downstream/core/src/utils';
import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';

const StyledMobileUnitIcon = styled.div`
    --width: 6.4rem;
    width: var(--width);
    height: calc(var(--width) * 1.3);
    background: ${colors.grey_5};

    mask-image: url('/icons/selectedFilled.svg');
    mask-size: 100%;
    mask-position: center;
    mask-repeat: no-repeat;
    z-index: 10;

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
        <StyledMobileUnitIcon className={className}>
            <div className="inner" onClick={onClick}>
                <div className="icon" />
            </div>
        </StyledMobileUnitIcon>
    );
};

const StyledMobileUnitPanel = styled(StyledHeaderPanel)`
    margin-top: 1rem;
    .header {
        padding: 1rem 1.5rem 1rem 1rem;
    }

    .bags > div:last-child .slots {
        margin-bottom: 0;
    }
`;

const MobileUnitContainer = styled.div`
    overflow: visible;
    margin-top: 0rem;

    position: relative;

    user-select: none;

    > .unitIcon {
        position: absolute;
        cursor: pointer;
        left: 1rem;
        top: -3.75rem;
    }

    > .label {
        text-align: right;
        color: ${colorMap.primaryText};
        font-size: 2.3rem;
        display: block;
        width: 100%;
        font-weight: 800;
        position: relative;

        > .name {
            position: relative;
            display: block;
            width: 15rem;
            left: 8rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .hashTag {
            color: ${colors.orange_0};
        }
    }

    > .stats {
        font-size: 1.25rem;
        text-align: right;
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
    const [isSpawningMobileUnit, setIsSpawningMobileUnit] = useState(false);

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
            if (!sendMessage) {
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

            // Focus camera
            const tileId = playerUnits[nextIndex].nextLocation?.tile.id;
            if (!tileId) {
                return;
            }
            const [q, r, s] = getTileCoordsFromId(tileId);
            sendMessage('MapCamera', 'FocusTile', JSON.stringify({ q, r, s }));
        },
        [playerUnits, selectMobileUnit, selectedMobileUnit, sendMessage]
    );

    const spawnMobileUnit = useCallback(() => {
        if (!player) {
            return;
        }
        const id = CompoundKeyEncoder.encodeUint160(
            NodeSelectors.MobileUnit,
            BigInt(Math.floor(Math.random() * 10000))
        );
        setIsSpawningMobileUnit(true);
        player
            .dispatch({ name: 'SPAWN_MOBILE_UNIT', args: [id] })
            .catch((e) => {
                console.error('failed to spawn mobileUnit:', e);
            })
            .finally(() => setIsSpawningMobileUnit(false));
    }, [player, setIsSpawningMobileUnit]);

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

    const mobileUnitBags = selectedMobileUnit ? getBagsAtEquipee(world?.bags || [], selectedMobileUnit) : [];
    const [life, def, atk] = getMobileUnitStats(selectedMobileUnit, world?.bags);

    return (
        <>
            {mapReady &&
                world &&
                player &&
                playerUnits.length > 0 &&
                (selectedMobileUnit ? (
                    <StyledMobileUnitPanel>
                        <div className="header">
                            <MobileUnitContainer>
                                <MobileUnitIcon className="unitIcon" onClick={selectAndFocusMobileUnit} />
                                <span className="label" onDoubleClick={() => nameEntity(selectedMobileUnit?.id)}>
                                    <span className="name">
                                        <span className="hashTag">#</span>
                                        {formatNameOrId(selectedMobileUnit, 'unit')}
                                    </span>
                                </span>
                                <div className="stats">
                                    <strong>ATK:</strong>
                                    {atk} <strong>DEF:</strong>
                                    {def} <strong>LIFE:</strong>
                                    {life}
                                </div>
                                <div className="unitSelector">
                                    <button onClick={() => selectNextMobileUnit(-1)}>prev</button>
                                    <button onClick={() => selectNextMobileUnit(1)}>next</button>
                                </div>
                            </MobileUnitContainer>
                        </div>
                        <div className="content">
                            <MobileUnitInventory mobileUnit={selectedMobileUnit} bags={mobileUnitBags} />
                        </div>
                    </StyledMobileUnitPanel>
                ) : (
                    <TextButton onClick={selectAndFocusMobileUnit}>Select Unit</TextButton>
                ))}
            {/* <TextButton onClick={spawnMobileUnit} disabled={isSpawningMobileUnit}>
                Spawn Unit
            </TextButton> */}
        </>
    );
};
