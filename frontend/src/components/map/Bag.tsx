import { getTileHeight } from '@app/helpers/tile';
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { WorldTileFragment, getCoords, ZoneWithBags } from '@downstream/core';
import { getBagsAtEquipee } from '@downstream/core/src/utils';
import { memo, useCallback, useMemo, useState } from 'react';

export interface BagData {
    q: number;
    r: number;
    s: number;
    height: number;
    corner: number; // 0,1,2,3,3,4,5
    selected?: '' | 'none' | 'highlight' | 'outline';
    sendScreenPosition: boolean;
}

export const Bag = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        corner,
        selected,
        sendScreenPosition,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & BagData) => {
        const [hovered, setHovered] = useState(false);

        onPointerEnter = useCallback(() => setHovered(true), []);
        onPointerExit = useCallback(() => setHovered(false), []);

        selected = selected != 'outline' && hovered ? 'highlight' : selected;

        useUnityComponentManager<BagData>({
            type: 'BagData',
            id,
            data: useMemo(
                () => ({ q, r, s, height, corner, selected, sendScreenPosition }),
                [q, r, s, height, corner, selected, sendScreenPosition]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });

        return null;
    }
);

export const Bags = memo(
    ({
        tiles,
        zone,
        selectedElementID,
        onClickBag,
    }: {
        tiles: WorldTileFragment[];
        zone?: ZoneWithBags;
        selectedMobileUnitID?: string;
        selectedElementID?: string;
        onClickBag: (id: string) => void;
    }) => {
        const bagComponents = useMemo(
            () =>
                (tiles || []).map((t) => {
                    const tileBags = getBagsAtEquipee(zone?.bags || [], t);
                    const coords = getCoords(t);

                    return tileBags.length > 0 ? (
                        <Bag
                            sendScreenPosition={false}
                            id={`bag/${t.id}`}
                            key={`bag/${t.id}`}
                            height={getTileHeight(t)}
                            corner={0}
                            selected={selectedElementID === `bag/${t.id}` ? 'outline' : 'none'}
                            onPointerClick={onClickBag}
                            {...coords}
                        />
                    ) : null;
                }),
            [tiles, selectedElementID, onClickBag, zone]
        );

        return <>{bagComponents}</>;
    }
);
