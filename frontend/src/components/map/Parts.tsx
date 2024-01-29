import { getTileHeightFromCoords } from '@app/helpers/tile';
import { WorldTileFragment, getCoords } from '@downstream/core';
import { memo, useMemo } from 'react';
import { FactoryBuilding } from './FactoryBuilding';
import { PartKindFragment, WorldPartFragment } from '@downstream/core/src/gql/graphql';
import { usePlayer } from '@app/hooks/use-game-state';
import { AbiCoder } from 'ethers';

export const Parts = memo(
    ({
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
                (parts || []).map((part) => {
                    if (!part.kind) {
                        return null;
                    }
                    if (!part.location?.tile) {
                        return null;
                    }
                    const partKind = partKinds.find((pk) => pk.id === part.kind?.id);
                    if (!partKind) {
                        return null;
                    }

                    const clickActionDef = partKind.actions.find((action) => action.node.name?.value == 'click');

                    const coords = getCoords(part.location.tile);
                    const height = getTileHeightFromCoords(coords);
                    const onClickPart = () => {
                        const coder = AbiCoder.defaultAbiCoder();
                        player
                            ?.dispatch({
                                name: 'CALL_ACTION_ON_PART',
                                args: [part.id, clickActionDef?.node.id, coder.encode(['address'], [player.addr])],
                            })
                            .catch((e) => {
                                console.error('Failed to call action on part', e);
                            });
                    };

                    console.log(part.allData);

                    return (
                        <FactoryBuilding
                            key={part.id}
                            id={part.id}
                            height={height}
                            model={'01-01'}
                            rotation={-30}
                            selected={'none'}
                            onPointerClick={clickActionDef ? onClickPart : undefined}
                            {...coords}
                        />
                    );
                }),
            [parts, partKinds, player]
        );

        return <>{partComponents}</>;
    }
);
