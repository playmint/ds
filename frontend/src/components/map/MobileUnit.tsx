import { getTileHeightFromCoords } from '@app/helpers/tile';
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { WorldMobileUnitFragment, getCoords } from '@downstream/core';
import { memo, useCallback, useMemo, useState } from 'react';

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
        screenPosition,
        onUpdatePosition,
    }: UnityComponentProps & MobileUnitData) => {
        const [hovered, setHovered] = useState(false);
        const [position, setPosition] = useState({ x: 0, y: 0, z: 0 });
        const [isVisible, setVisible] = useState({ isVisible: false });

        const screenPositionHandler = (
            id?: string,
            type?: string,
            x?: number,
            y?: number,
            z?: number,
            isVisible?: boolean
        ) => {
            if (screenPosition && id && type && x && y && z && isVisible !== undefined) {
                screenPosition(id, type, x, y, z, isVisible);
            }
            if (x !== undefined && y !== undefined && z !== undefined) {
                const scale = 1 / (1 + z);
                setPosition({ x, y, z: scale });
            }
            if (isVisible !== undefined) {
                setVisible({ isVisible });
            }
            if (x !== undefined && y !== undefined && z !== undefined && id !== undefined && isVisible !== undefined) {
                const scale = 1 / (1 + z);
                setPosition({ x, y, z: scale });
                if (onUpdatePosition) {
                    onUpdatePosition(id, x, y, scale, isVisible); // Call the callback here
                }
            }
        };

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
                    position,
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
                    position,
                    isVisible,
                ]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
            screenPosition: screenPositionHandler,
        });

        return null;
    }
);

export const MobileUnits = memo(
    ({
        mobileUnits,
        selectedMobileUnitID,
        onClickMobileUnit,
        playerID,
    }: {
        mobileUnits?: WorldMobileUnitFragment[];
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
                    const atBuilding = !!tile.building;
                    return { ...u, visible, isPlayer, coords, counter, height, atBuilding };
                });
        }, [mobileUnits, playerID]);

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

                        const commonStyles = {
                            position: 'absolute',
                            width: `${550 * unitPositions[u.id]?.z}px`,
                            height: `${600 * unitPositions[u.id]?.z}px`,
                            left: `${unitPositions[u.id]?.x * 100}vw`,
                            bottom: `${unitPositions[u.id]?.y * 100}vh`,
                            zIndex: '1',
                            marginLeft: `-${275 * unitPositions[u.id]?.z}px`,
                            marginTop: `-${275 * unitPositions[u.id]?.z}px`,
                            WebkitMaskImage: `url("/icons/HexBadge_Icons.svg")`,
                            WebkitMaskRepeat: 'no-repeat',
                            WebkitMaskSize: '100%',
                            WebkitMaskPosition: `center`,
                            display: 'block',
                        };

                        const selectedStyles = {
                            ...commonStyles,
                            backgroundColor: '#fa6501',
                        };

                        const unselectedStyles = {
                            ...commonStyles,
                            backgroundColor: '#000',
                        };

                        return (
                            <div key={u.id} style={isSelected ? selectedStyles : unselectedStyles}>
                                {u.counter.count > 1 ? (
                                    <div
                                        style={{
                                            width: `100%`,
                                            height: `100%`,
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            textAlign: 'center',
                                            verticalAlign: 'middle',
                                            lineHeight: '100%',
                                            fontSize: `${200 * unitPositions[u.id]?.z}pt`,
                                            color: 'white',
                                            fontWeight: '800',
                                            display: 'flex',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                        }}
                                    >
                                        {u.counter.count}
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            width: `100%`,
                                            height: `100%`,
                                            position: 'absolute',
                                            WebkitMaskImage: `url("/icons/UnitIcon.svg")`,
                                            WebkitMaskRepeat: 'no-repeat',
                                            WebkitMaskSize: '50%',
                                            WebkitMaskPosition: `center`,
                                            display: 'block',
                                            backgroundColor: '#FFF',
                                        }}
                                    ></div>
                                )}
                            </div>
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
