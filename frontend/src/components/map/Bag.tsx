import { getTileHeight } from '@app/helpers/tile';
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { WorldStateFragment, WorldTileFragment, getCoords } from '@downstream/core';
import { getBagsAtEquipee, getSessionsAtTile } from '@downstream/core/src/utils';
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
        world,
        selectedMobileUnitID,
        selectedElementID,
        onClickBag,
    }: {
        tiles: WorldTileFragment[];
        world?: WorldStateFragment;
        selectedMobileUnitID?: string;
        selectedElementID?: string;
        onClickBag: (id: string) => void;
    }) => {
        const bagComponents = useMemo(
            () =>
                (tiles || []).map((t) => {
                    const tileBags = getBagsAtEquipee(world?.bags || [], t);
                    const tileSessions = getSessionsAtTile(world?.sessions || [], t);
                    const coords = getCoords(t);
                    const rewardBags =
                        (selectedMobileUnitID &&
                            tileSessions.flatMap((cs) => {
                                return getBagsAtEquipee(world?.bags || [], cs).filter((bag) => {
                                    if (!cs.attackTile || cs.attackTile.tile.id !== t.id) {
                                        return false;
                                    }
                                    // reward containing bags have an ID that is made up of 16bits of sessionID and 48bits of MobileUnitID
                                    // bagIDs are 64bits
                                    const mobileUnitIdMask = BigInt('0xFFFFFFFFFFFF'); // 48bit mask (6 bytes)
                                    const bagMobileUnitID = (BigInt(bag.id) >> BigInt(16)) & mobileUnitIdMask;
                                    const truncatedMobileUnitID = BigInt(selectedMobileUnitID) & mobileUnitIdMask;
                                    return bagMobileUnitID === truncatedMobileUnitID;
                                });
                            })) ||
                        [];

                    return tileBags.length > 0 || rewardBags.length > 0 ? (
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
            [tiles, selectedMobileUnitID, selectedElementID, onClickBag, world]
        );

        return <>{bagComponents}</>;
    }
);
