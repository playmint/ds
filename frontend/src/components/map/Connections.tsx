import { getTileHeightFromCoords } from '@app/helpers/tile';
import { WorldBuildingFragment, WorldTileFragment, getCoords } from '@downstream/core';
import { memo, useMemo } from 'react';
import { Path } from './Path';

// function getColorFromGoo(kind) {
//     const outputName = kind?.outputs?.find((e) => ['Green Goo', 'Blue Goo', 'Red Goo'].includes(e.item.name?.value))
//         ?.item.name?.value;
//     switch (outputName) {
//         case 'Green Goo':
//             return '#63B204FF';
//         case 'Red Goo':
//             return '#CA002BFF';
//         case 'Blue Goo':
//             return '#0665F5FF';
//         default:
//             return '#FFFFFFFF';
//     }
// }

// const lerp = (x, y, a) => x * (1 - a) + y * a;

export const Connections = memo(
    ({
        tiles,
        buildings,
    }: {
        tiles: WorldTileFragment[];
        buildings: WorldBuildingFragment[];
        selectedElementID?: string;
    }) => {
        const connectionPaths = useMemo(
            () =>
                (buildings || []).flatMap((b) => {
                    if (!b.kind) {
                        return null;
                    }
                    if (!b.location?.tile) {
                        return null;
                    }
                    const coordsFrom = getCoords(b.location.tile);
                    const heightFrom = getTileHeightFromCoords(coordsFrom);
                    // const selected = selectedElementID === b.id ? 'outline' : 'none';
                    const tileFrom = tiles.find(({ id }) => id === b.location?.tile.id);

                    const gooPipePaths = b.gooPipes.map((gooPipe) => {
                        if (!gooPipe.node.location?.tile) {
                            return null;
                        }

                        const coordsTo = getCoords(gooPipe.node.location.tile);
                        const heightTo = getTileHeightFromCoords(coordsTo);
                        const tileTo = tiles.find(({ id }) => id === gooPipe.node.location?.tile.id);

                        return (
                            <Path
                                key={'gooPath/' + tileFrom?.id + '/' + tileTo?.id}
                                qFrom={coordsFrom.q}
                                rFrom={coordsFrom.r}
                                sFrom={coordsFrom.s}
                                heightFrom={heightFrom + 0.3}
                                qTo={coordsTo.q}
                                rTo={coordsTo.r}
                                sTo={coordsTo.s}
                                heightTo={heightTo}
                                color={'#FF00FF'}
                            />
                        );
                    });

                    const triggerPaths = b.triggers.map((trigger) => {
                        if (!trigger.node.location?.tile) {
                            return null;
                        }

                        const coordsTo = getCoords(trigger.node.location.tile);
                        const heightTo = getTileHeightFromCoords(coordsTo);
                        const tileTo = tiles.find(({ id }) => id === trigger.node.location?.tile.id);

                        return (
                            <Path
                                key={'triggerPath/' + tileFrom?.id + '/' + tileTo?.id}
                                qFrom={coordsFrom.q}
                                rFrom={coordsFrom.r}
                                sFrom={coordsFrom.s}
                                heightFrom={heightFrom + 0.3}
                                qTo={coordsTo.q}
                                rTo={coordsTo.r}
                                sTo={coordsTo.s}
                                heightTo={heightTo}
                                color={'#FFFF00'}
                            />
                        );
                    });

                    return [...gooPipePaths, ...triggerPaths];
                }),
            [buildings, tiles]
        );

        return <>{connectionPaths}</>;
    }
);
