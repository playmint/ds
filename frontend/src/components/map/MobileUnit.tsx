import { getTileHeightFromCoords } from '@app/helpers/tile';
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { WorldBuildingFragment, WorldMobileUnitFragment, getCoords, PluginMapProperty } from '@downstream/core';
import { memo, useCallback, useMemo, useState } from 'react';
import Icon from './Icon';
import { getBuildingAtTile } from '@downstream/core/src/utils';
// import { BLOCK_TIME_SECS } from '@app/fixtures/block-time-secs';

// public int q;
// public int r;
// public int s;
// public float height;
// public float progress; // 0 -> 1 percent between prev/next
// public string? selected; // ={none/highlight/outline}
// public bool shared; //  ie sharing with a building
// public bool visible;

export const DEBUG_ALWAYS_SHOW_UNITS = false;

export interface MobileUnitData {
    q: number;
    r: number;
    s: number;
    height: number;
    progress: number;
    selected?: 'none' | 'highlight' | 'outline';
    color?: string;
    model?: string;
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
        color,
        model,
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
                    const precision = 5;
                    const newPosition = {
                        x: Number(x.toFixed(precision)),
                        y: Number(y.toFixed(precision)),
                        z: Number(scale.toFixed(4)),
                    };
                    setPosition(newPosition);
                    if (onUpdatePosition) {
                        onUpdatePosition(id, newPosition.x, newPosition.y, newPosition.z, isVisible); // Call the callback here
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
                    color: color,
                    model: model,
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
                    color,
                    model,
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
        currentBlock,
        mobileUnits,
        buildings,
        selectedMobileUnitID,
        onClickMobileUnit,
        playerID,
        pluginProperties,
        unitTimeoutBlocks,
    }: {
        currentBlock: number;
        mobileUnits?: WorldMobileUnitFragment[];
        buildings: WorldBuildingFragment[];
        selectedMobileUnitID?: string;
        playerID?: string;
        onClickMobileUnit: (id: string) => void;
        pluginProperties: PluginMapProperty[];
        unitTimeoutBlocks: number;
    }) => {
        const [unitPositions, setUnitPositions] = useState({}); // New state for positions

        const updatePosition = useCallback((id, x, y, z, isVisible) => {
            setUnitPositions((prev) => ({ ...prev, [id]: { x, y, z, isVisible } }));
        }, []);

        const units = useMemo(() => {
            const counts = new Map<string, { count: number }>();
            return (mobileUnits || [])
                .filter((u) => !!u.nextLocation?.tile)
                .filter((u) => {
                    if (DEBUG_ALWAYS_SHOW_UNITS) return true;

                    // Always show player unit so they can be selected
                    const isPlayerUnit = u.owner?.id == playerID;
                    if (isPlayerUnit) return true;

                    if (!u.nextLocation) {
                        throw new Error('missing location');
                    }

                    // Hide units if they haven't moved in `UNIT_DISPLAY_TIMEOUT_BLOCK_COUNT` blocks;
                    return currentBlock - u.nextLocation.time < unitTimeoutBlocks;
                })
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
        }, [mobileUnits, playerID, currentBlock, unitTimeoutBlocks, buildings]);

        const unitComponents = useMemo(
            () =>
                units.map((u) => {
                    // Make this like Tile.tsx line 71
                    const color = pluginProperties
                        .find((prop) => prop.id == u.id && prop.key == 'color')
                        ?.value.toString();
                    const model = pluginProperties
                        .find((prop) => prop.id == u.id && prop.key == 'model')
                        ?.value.toString();
                    return (
                        <MobileUnit
                            sendScreenPosition={true}
                            screenPositionHeightOffset={0.55}
                            key={u.id}
                            id={u.id}
                            height={u.height}
                            progress={1}
                            selected={selectedMobileUnitID === u.id ? 'outline' : 'none'}
                            color={color}
                            shared={u.atBuilding}
                            visible={u.visible}
                            onPointerClick={onClickMobileUnit}
                            onUpdatePosition={updatePosition}
                            model={model || 'Unit_Hoodie_07'}
                            {...u.coords}
                        />
                    );
                }),
            [onClickMobileUnit, selectedMobileUnitID, units, updatePosition, pluginProperties]
        );

        const unitIcons = useMemo(
            () =>
                units.map((u) => {
                    if (unitPositions[u.id]?.isVisible) {
                        if (u.isPlayer) {
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
                        } else if (
                            u.counter.count > 1 &&
                            !units.some(
                                (unit) =>
                                    unit.id !== u.id &&
                                    unit.isPlayer &&
                                    unit.coords.q === u.coords.q &&
                                    unit.coords.r === u.coords.r &&
                                    unit.coords.s === u.coords.s
                            )
                        ) {
                            return (
                                <Icon
                                    key={u.id}
                                    count={u.counter.count}
                                    iconMask={`url('/icons/UnitIcon.svg')`}
                                    position={unitPositions[u.id]}
                                    isSelected={false}
                                />
                            );
                        } else {
                            return null;
                        }
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
