import { getTileHeightFromCoords } from '@app/helpers/tile';
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { WorldMobileUnitFragment, getCoords } from '@downstream/core';
import { memo, useCallback, useMemo, useState } from 'react';
import { Icon } from './Icon';
import { Label } from './Label';

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
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & MobileUnitData) => {
        const [hovered, setHovered] = useState(false);

        onPointerEnter = useCallback(() => setHovered(true), []);
        onPointerExit = useCallback(() => setHovered(false), []);

        selected = selected != 'outline' && hovered ? 'highlight' : selected;

        useUnityComponentManager<MobileUnitData>({
            type: 'MobileUnitData',
            id,
            data: useMemo(
                () => ({ q, r, s, height, progress, selected: selected || 'none', shared, visible }),
                [q, r, s, height, progress, selected, shared, visible]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
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
                            key={u.id}
                            id={u.id}
                            height={u.height}
                            progress={1}
                            selected={selectedMobileUnitID === u.id ? 'outline' : 'none'}
                            shared={u.atBuilding}
                            visible={u.visible}
                            onPointerClick={onClickMobileUnit}
                            {...u.coords}
                        />
                    );
                }),
            [onClickMobileUnit, selectedMobileUnitID, units]
        );

        const unitCounters = useMemo(
            () =>
                units.map((u) => {
                    if (u.counter.count > 1 && !u.isPlayer) {
                        return (
                            <Label
                                text={u.counter.count.toString()}
                                key={`${u.id}-icon`}
                                id={`${u.id}-icon`}
                                height={u.height + 0.7}
                                {...u.coords}
                            />
                        );
                    }

                    return null;
                }),
            [units]
        );

        const unitIcons = useMemo(
            () =>
                units.map((u) =>
                    u.isPlayer ? (
                        <Icon
                            backgroundColor={'#000000FF'}
                            foregroundColor={'#FFFFFFFF'}
                            image={'https://assets.downstream.game/icons/31-122.svg'}
                            key={u.id}
                            id={u.id}
                            height={u.height + 0.7}
                            {...u.coords}
                        />
                    ) : null
                ),
            [units]
        );

        return (
            <>
                {unitComponents}
                {unitIcons}
                {unitCounters}
            </>
        );
    }
);
