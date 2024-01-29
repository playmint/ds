import { getTileHeightFromCoords } from '@app/helpers/tile';
import { WorldTileFragment, getCoords } from '@downstream/core';
import { memo, useMemo } from 'react';
import { FactoryBuilding } from './FactoryBuilding';
import { PartKindFragment, WorldPartFragment } from '@downstream/core/src/gql/graphql';
import { usePlayer } from '@app/hooks/use-game-state';
import { AbiCoder } from 'ethers';

export const Parts = memo(
    ({
        tiles,
        parts,
        partKinds,
    }: {
        tiles: WorldTileFragment[];
        parts: WorldPartFragment[];
        partKinds: PartKindFragment[];
    }) => {
        const player = usePlayer();
        const partComponents = useMemo(
            () =>
                (parts || []).map((b) => {
                    if (!b.kind) {
                        return null;
                    }
                    if (!b.location?.tile) {
                        return null;
                    }
                    const partKind = partKinds.find((pk) => pk.id === b.kind?.id);
                    if (!partKind) {
                        return null;
                    }

                    const clickActionDef = partKind.actions.find((action) => action.node.name?.value == 'click');

                    const coords = getCoords(b.location.tile);
                    const height = getTileHeightFromCoords(coords);
                    const onClickPart = () => {
                        console.log('Part Clicked!', b.allData);
                        const coder = AbiCoder.defaultAbiCoder();
                        player
                            ?.dispatch({
                                name: 'CALL_ACTION_ON_PART',
                                args: [b.id, clickActionDef?.node.id, coder.encode(['address'], [player.addr])],
                            })
                            .catch((e) => {
                                console.error('Failed to call action on part', e);
                            });
                    };

                    console.log(b.allData);

                    return (
                        <FactoryBuilding
                            key={b.id}
                            id={b.id}
                            height={height}
                            model={'01-01'}
                            rotation={-30}
                            selected={'none'}
                            onPointerClick={clickActionDef ? onClickPart : undefined}
                            {...coords}
                        />
                    );
                }),
            [parts, tiles, player]
        );

        return <>{partComponents}</>;
    }
);
