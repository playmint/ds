import { getTileHeight } from '@app/helpers/tile';
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { WorldTileFragment, getCoords } from '@downstream/core';
import { memo, useCallback, useMemo, useState } from 'react';
import { Label } from './Label';
import { Icon } from './Icon';

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
        tiles,
        selectedMobileUnitID,
        onClickMobileUnit,
        playerID,
    }: {
        tiles?: WorldTileFragment[];
        selectedMobileUnitID?: string;
        playerID?: string;
        onClickMobileUnit: (id: string) => void;
    }) => {
        const units = useMemo(
            () =>
                (tiles || []).flatMap((t) => {
                    const coords = getCoords(t);
                    const height = getTileHeight(t);
                    let foundPlayer = false;
                    return t.mobileUnits.map((u, i) => {
                        // Show either the last unit in the array or the player unit in the array.
                        const isPlayer = u.owner?.id == playerID;
                        if (isPlayer) {
                            foundPlayer = true;
                        }
                        const isLast = i == t.mobileUnits.length - 1;
                        const visible = isPlayer || (isLast && !foundPlayer);
                        return { t, u, visible, isPlayer, coords, height };
                    });
                }),
            [tiles, playerID]
        );

        const unitComponents = useMemo(() => {
            console.time('mobileUnitsLoop');
            const mus = units.map(({ t, u, visible, height, coords }) => {
                return (
                    <MobileUnit
                        key={u.id}
                        id={u.id}
                        height={height}
                        progress={1}
                        selected={selectedMobileUnitID === u.id ? 'outline' : 'none'}
                        shared={!!t.building}
                        visible={visible}
                        onPointerClick={onClickMobileUnit}
                        {...coords}
                    />
                );
            });

            console.timeEnd('mobileUnitsLoop');
            return mus;
        }, [onClickMobileUnit, selectedMobileUnitID, units]);

        const unitCounters = useMemo(() => {
            const mus = units.map(({ t, u, coords, height, isPlayer }) => {
                if (t.mobileUnits.length > 1 && !isPlayer) {
                    return (
                        <Label
                            text={t.mobileUnits.length.toString()}
                            key={`${u.id}-icon`}
                            id={`${u.id}-icon`}
                            height={height + 0.7}
                            {...coords}
                        />
                    );
                }

                return null;
            });
            return mus;
        }, [units]);

        const unitIcons = useMemo(
            () =>
                units.map(({ u, height, isPlayer, coords }) =>
                    isPlayer ? (
                        <Icon
                            backgroundColor={'#000000FF'}
                            foregroundColor={'#FFFFFFFF'}
                            image={'https://assets.downstream.game/icons/31-122.svg'}
                            key={u.id}
                            id={u.id}
                            height={height + 0.7}
                            {...coords}
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
