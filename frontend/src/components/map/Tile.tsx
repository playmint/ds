import { getTileHeight } from '@app/helpers/tile';
import { UnityComponentProps, useUnityComponentManager } from '@app/hooks/use-unity-component-manager';
import { WorldTileFragment, getCoords } from '@downstream/core';
import { memo, useCallback, useMemo, useState } from 'react';
import { TileHighlight } from './TileHighlight';

export interface TileData {
    q: number;
    r: number;
    s: number;
    height: number;
    color: string;
    sendScreenPosition: boolean;
}

export const Tile = memo(
    ({
        id,
        q,
        r,
        s,
        height,
        color,
        sendScreenPosition,
        onPointerEnter,
        onPointerExit,
        onPointerClick,
    }: UnityComponentProps & TileData) => {
        useUnityComponentManager<TileData>({
            type: 'TileData',
            id,
            data: useMemo(
                () => ({ q, r, s, height, color, sendScreenPosition }),
                [q, r, s, height, color, sendScreenPosition]
            ),
            onPointerEnter,
            onPointerExit,
            onPointerClick,
        });

        return null;
    }
);

export const Tiles = memo(
    ({
        tiles,
        selectedTiles,
        onClickTile,
    }: {
        tiles?: WorldTileFragment[];
        selectedTiles?: WorldTileFragment[];
        onClickTile: (id: string) => void;
    }) => {
        const [hovered, setHovered] = useState<string | undefined>();
        const hoveredTile = hovered && tiles ? tiles.find((t) => t.id === hovered) : undefined;

        const enter = useCallback((id) => {
            setHovered(id);
        }, []);

        const exit = useCallback((id) => {
            setHovered((prev) => (prev == id ? undefined : prev));
        }, []);

        const tileComponents = useMemo(
            () =>
                (tiles || []).map((t) => {
                    const coords = getCoords(t);
                    return (
                        <Tile
                            key={t.id}
                            id={t.id}
                            height={getTileHeight(t)}
                            color="#7288A6"
                            onPointerEnter={enter}
                            onPointerExit={exit}
                            onPointerClick={onClickTile}
                            {...coords}
                        />
                    );
                }),
            [tiles, enter, exit, onClickTile]
        );

        return (
            <>
                {tileComponents}
                {hoveredTile &&
                    [hoveredTile].map((t) => {
                        const coords = getCoords(t);
                        return (
                            <TileHighlight
                                key={`hov-${t.id}`}
                                id={`hov-${t.id}`}
                                height={getTileHeight(t)}
                                color="white"
                                style="gradient_blue"
                                animation="none"
                                {...coords}
                            />
                        );
                    })}
                {(selectedTiles || []).map((t) => {
                    const coords = getCoords(t);
                    return (
                        <TileHighlight
                            key={`selected-${t.id}`}
                            id={`selected-${t.id}`}
                            height={getTileHeight(t)}
                            color="white"
                            style="gradient_outline"
                            animation="none"
                            {...coords}
                        />
                    );
                })}
            </>
        );
    }
);
