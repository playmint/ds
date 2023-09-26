import { getTileHeight } from '@app/helpers/tile';
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { WorldTileFragment, getCoords } from '@downstream/core';
import { memo, useCallback, useMemo, useState } from 'react';

export interface BagData {
    q: number;
    r: number;
    s: number;
    height: number;
    corner: number; // 0,1,2,3,3,4,5
    selected?: '' | 'none' | 'highlight' | 'outline';
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
            data: useMemo(() => ({ q, r, s, height, corner, selected }), [q, r, s, height, corner, selected]),
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
        selectedMobileUnitID,
        selectedElementID,
        onClickBag,
    }: {
        tiles?: WorldTileFragment[];
        selectedMobileUnitID?: string;
        selectedElementID?: string;
        onClickBag: (id: string) => void;
    }) => {
        const bagComponents = useMemo(
            () =>
                (tiles || []).map((t) => {
                    const coords = getCoords(t);
                    const rewardBags =
                        (selectedMobileUnitID &&
                            t.sessions.flatMap((cs) => {
                                return cs.bags.filter((equipSlot) => {
                                    if (!cs.attackTile || cs.attackTile.tile.id !== t.id) {
                                        return false;
                                    }
                                    // reward containing bags have an ID that is made up of 16bits of sessionID and 48bits of MobileUnitID
                                    // bagIDs are 64bits
                                    const mobileUnitIdMask = BigInt('0xFFFFFFFFFFFF'); // 48bit mask (6 bytes)
                                    const bagMobileUnitID = (BigInt(equipSlot.bag.id) >> BigInt(16)) & mobileUnitIdMask;
                                    const truncatedMobileUnitID = BigInt(selectedMobileUnitID) & mobileUnitIdMask;
                                    return bagMobileUnitID === truncatedMobileUnitID;
                                });
                            })) ||
                        [];

                    return t.bagCount > 0 || rewardBags.length > 0 ? (
                        <Bag
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
            [tiles, selectedMobileUnitID, selectedElementID, onClickBag]
        );

        return <>{bagComponents}</>;
    }
);
