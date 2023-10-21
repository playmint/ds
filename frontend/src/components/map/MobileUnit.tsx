import { getTileHeightFromCoords } from '@app/helpers/tile';
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { WorldBuildingFragment, WorldMobileUnitFragment, getCoords } from '@downstream/core';
import { memo, useCallback, useMemo, useState } from 'react';
import Icon from './Icon';
import { getBuildingAtTile } from '@downstream/core/src/utils';

// public int q;
// public int r;
// public int s;
// public float height;
// public float progress; // 0 -> 1 percent between prev/next
// public string? selected; // ={none/highlight/outline}
// public bool shared; //  ie sharing with a building
// public bool visible;

export interface MobileUnitData {
    q: number;
    r: number;
    s: number;
    height: number;
    progress: number;
    selected?: 'none' | 'highlight' | 'outline';
    shared: boolean;
    visible: boolean;
    sendScreenPosition: boolean;
    screenPositionHeightOffset: number;
    onUpdatePosition?: (id: string, x: number, y: number, z: number, isVisible: boolean) => void;
}

export const MobileUnit = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        progress,
        selected,
        shared,
        visible,
        sendScreenPosition,
        screenPositionHeightOffset,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
        onUpdatePosition,
    }: UnityComponentProps & MobileUnitData) => {
        const [hovered, setHovered] = useState(false);
        const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
        const [isVisible, setVisible] = useState(false);
        const { x, y, z } = position;

        const onPositionUpdate = useCallback(
            (id?: string, _type?: string, x?: number, y?: number, z?: number, isVisible?: boolean) => {
                // if (x !== undefined && y !== undefined && z !== undefined) {
                //     const scale = 1 / (1 + z);
                //     setPosition({ x, y, z: scale });
                // }
                if (isVisible !== undefined) {
                    setVisible(isVisible);
                }
                if (
                    x !== undefined &&
                    y !== undefined &&
                    z !== undefined &&
                    id !== undefined &&
                    isVisible !== undefined
                ) {
                    const scale = 1 / (1 + z);
                    const precision = 1;
                    setPosition({
                        x: Number(x.toFixed(precision)),
                        y: Number(y.toFixed(precision)),
                        z: Number(scale.toFixed(precision)),
                    });
                    if (onUpdatePosition) {
                        onUpdatePosition(id, x, y, scale, isVisible); // Call the callback here
                    }
                }
            },
            [onUpdatePosition]
        );

        onPointerEnter = useCallback(() => setHovered(true), []);
        onPointerExit = useCallback(() => setHovered(false), []);

        selected = selected != 'outline' && hovered ? 'highlight' : selected;

        useUnityComponentManager<MobileUnitData>({
            type: 'MobileUnitData',
            id,
            data: useMemo(
                () => ({
                    q,
                    r,
                    s,
                    height,
                    progress,
                    sendScreenPosition,
                    screenPositionHeightOffset,
                    selected: selected || 'none',
                    shared,
                    visible,
                    position: { x, y, z },
                    isVisible,
                }),
                [
                    q,
                    r,
                    s,
                    height,
                    progress,
                    selected,
                    shared,
                    visible,
                    sendScreenPosition,
                    screenPositionHeightOffset,
                    x,
                    y,
                    z,
                    isVisible,
                ]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
            onPositionUpdate,
        });

        return null;
    }
);

export const MobileUnits = memo(
    ({
        mobileUnits,
        buildings,
        selectedMobileUnitID,
        onClickMobileUnit,
        playerID,
    }: {
        mobileUnits?: WorldMobileUnitFragment[];
        buildings: WorldBuildingFragment[];
        selectedMobileUnitID?: string;
        playerID?: string;
        onClickMobileUnit: (id: string) => void;
    }) => {
        const [unitPositions, setUnitPositions] = useState({}); // New state for positions

        const updatePosition = useCallback((id, x, y, z, isVisible) => {
            setUnitPositions((prev) => ({ ...prev, [id]: { x, y, z, isVisible } }));
        }, []);

        const units = useMemo(() => {
            const counts = new Map<string, { count: number }>();
            return (mobileUnits || [])
                .filter((u) => !!u.nextLocation?.tile)
                .map((u) => {
                    const tile = u.nextLocation?.tile;
                    if (!tile) {
                        throw new Error('missing location');
                    }
                    const counter = counts.get(tile.id) || { count: 0 };
                    counter.count++;
                    const visible = counter.count == 1;
                    counts.set(tile.id, counter);
                    const coords = getCoords(tile);
                    const height = getTileHeightFromCoords(coords);
                    const isPlayer = u.owner?.id == playerID;
                    const building = getBuildingAtTile(buildings, tile);
                    const atBuilding = !!building;
                    return { ...u, visible, isPlayer, coords, counter, height, atBuilding };
                });
        }, [mobileUnits, playerID, buildings]);

        const unitComponents = useMemo(
            () =>
                units.map((u) => {
                    return (
                        <MobileUnit
                            sendScreenPosition={true}
                            screenPositionHeightOffset={0.55}
                            key={u.id}
                            id={u.id}
                            height={u.height}
                            progress={1}
                            selected={selectedMobileUnitID === u.id ? 'outline' : 'none'}
                            shared={u.atBuilding}
                            visible={u.visible}
                            onPointerClick={onClickMobileUnit}
                            onUpdatePosition={updatePosition}
                            {...u.coords}
                        />
                    );
                }),
            [onClickMobileUnit, selectedMobileUnitID, units, updatePosition]
        );

        const unitIcons = useMemo(
            () =>
                units.map((u) => {
                    if (u.isPlayer && unitPositions[u.id]?.isVisible) {
                        const isSelected = selectedMobileUnitID === u.id;
                        return (
                            <Icon
                                key={u.id}
                                count={u.counter.count}
                                iconMask={`url('/icons/UnitIcon.svg')`}
                                position={unitPositions[u.id]}
                                isSelected={isSelected}
                            />
                        );
                    } else {
                        return null;
                    }
                }),
            [units, unitPositions, selectedMobileUnitID]
        );

        return (
            <>
                {unitComponents}
                {unitIcons}
            </>
        );
    }
);
