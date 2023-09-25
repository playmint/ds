import {
    BiomeKind,
    ConnectedPlayer,
    PluginType,
    SelectedMobileUnitFragment,
    Selector,
    World,
    WorldBuildingFragment,
    WorldTileFragment,
} from '@app/../../core/src';
import { PluginContent } from '@app/components/organisms/tile-action';
import {
    GOO_BLUE,
    GOO_GREEN,
    GOO_RED,
    getCoords,
    getGooRates,
    getNeighbours,
    getTileDistance,
} from '@app/helpers/tile';
import { useBuildingKinds, usePlayer, usePluginState, useSelection, useWorld } from '@app/hooks/use-game-state';
import { Bag } from '@app/plugins/inventory/bag';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { TileInventory } from '@app/plugins/inventory/tile-inventory';
import { MobileUnitList } from '@app/plugins/mobile-unit-list';
import { FunctionComponent, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';

interface KeyedThing {
    key: number;
}

const byKey = (a: KeyedThing, b: KeyedThing) => {
    return a.key > b.key ? 1 : -1;
};

const Panel = styled.div`
    background: #143063;
    color: #fff;
    padding: 2rem 2rem;
    margin-bottom: 1.2rem;
    width: 30rem;

    h3 {
        margin-bottom: 0;
    }

    > .building-image {
        margin: 2rem auto;
        position: relative;
        left: -1rem;
    }

    .sub-title {
        display: block;
        margin-bottom: 1rem;
        font-size: 1.3rem;
        margin-right: 1rem;
    }

    abbr {
        display: inline-block;
        padding-left: 0.6rem;
    }

    .secondary-button {
        color: #ccc;
        text-align: center;
        display: inline-block;
    }
    > .action {
        padding: 0 !important;
        border-bottom: 0 !important;
    }
    > .description {
        margin-bottom: 2rem;
    }
    .process {
        text-align: center;
        width: 100%;
        height: 32px;
        text-overflow: hidden;
    }
    img.arrow {
        display: inline-block;
        width: 32px;
    }

    form {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 1.2rem;

        .ingredients {
            margin: 0 auto;
        }
    }

    > .label {
        width: 12rem;
        height: 1.7rem;
        white-space: nowrap;
        font-size: 1.4rem;
        overflow: hidden;
        text-overflow: ellipsis;
        display: inline-block;
        opacity: 0.4;
    }
`;

interface TileBuildingProps {
    canUse: boolean;
    building: WorldBuildingFragment;
    world?: World;
    mobileUnit?: SelectedMobileUnitFragment;
}
const TileBuilding: FunctionComponent<TileBuildingProps> = ({ building, world, mobileUnit, canUse }) => {
    const { tiles: selectedTiles } = useSelection();
    const selectedTile = selectedTiles?.[0];
    const ui = usePluginState();
    const kinds = useBuildingKinds();
    const component = (ui || [])
        .filter((p) => p.config.type === PluginType.BUILDING && p.config.kindID === building.kind?.id)
        .flatMap((p) => p.state.components)
        .find(() => true);

    const buildingKind = (kinds || []).find((k) => k.id == building.kind?.id);
    const inputs = buildingKind?.inputs.sort(byKey) || [];
    const outputs = buildingKind?.outputs.sort(byKey) || [];

    const inputsRef = useRef<HTMLDivElement>(null);
    const outputsRef = useRef<HTMLDivElement>(null);
    const { addBagRef, removeBagRef } = useInventory();
    useEffect(() => {
        addBagRef(inputsRef);
        addBagRef(outputsRef);
        return () => {
            removeBagRef(inputsRef);
            removeBagRef(outputsRef);
        };
    }, [addBagRef, removeBagRef]);

    const inputBag = building.bags.find((b) => b.key == 0);
    const outputBag = building.bags.find((b) => b.key == 1);

    const author = world?.players.find((p) => p.id === building?.kind?.owner?.id);
    const owner = world?.players.find((p) => p.id === building?.owner?.id);

    const name = building?.kind?.name?.value ?? 'Unnamed Building';
    const description = building?.kind?.description?.value;

    const { q, r, s } = selectedTile ? getCoords(selectedTile) : { q: 0, r: 0, s: 0 };
    const gooRates = selectedTile ? getGooRates(selectedTile) : [];
    const gooRatesInNameOrder = [GOO_RED, GOO_GREEN, GOO_BLUE]
        .map((idx) => gooRates.find((goo) => goo.index === idx))
        .filter((goo) => !!goo);

    const content = (component?.content || []).find((c) => {
        if (mobileUnit) {
            return c.id === 'use' || c.id === 'default';
        }
        return c.id === 'view';
    });

    return (
        <Panel>
            <h3>{name}</h3>
            {description && <span className="sub-title">{description}</span>}
            {canUse && content && (
                <PluginContent content={content}>
                    {mobileUnit && (
                        <>
                            {inputs.length > 0 && inputBag && (
                                <div ref={inputsRef} className="ingredients">
                                    <Bag
                                        bag={inputBag.bag}
                                        bagId={inputBag.bag.id}
                                        equipIndex={0}
                                        ownerId={building.id}
                                        isInteractable={true}
                                        recipe={inputs}
                                        numBagSlots={inputs.length}
                                        showIcon={false}
                                    />
                                </div>
                            )}
                            {outputs.length > 0 && outputBag && (
                                <div className="process">
                                    <img src="/icons/downarrow.png" alt="output" className="arrow" />
                                </div>
                            )}
                            {outputs.length > 0 && outputBag && (
                                <div ref={outputsRef} className="ingredients">
                                    <Bag
                                        bag={outputBag.bag}
                                        bagId={outputBag.bag.id}
                                        equipIndex={1}
                                        ownerId={building.id}
                                        isInteractable={true}
                                        recipe={outputs}
                                        numBagSlots={outputs.length}
                                        showIcon={false}
                                    />
                                </div>
                            )}
                        </>
                    )}
                </PluginContent>
            )}
            {selectedTile && <TileInventory tile={selectedTile} />}
            <span className="label" style={{ width: '100%', marginTop: '2rem' }}>
                <strong>COORDINATES:</strong> {`${q}, ${r}, ${s}`}
            </span>
            {gooRatesInNameOrder.map((goo) => (
                <span key={goo?.name} className="label" style={{ width: '30%' }}>
                    <strong>{goo?.name.toUpperCase().slice(0, 1)}:</strong>{' '}
                    {`${Math.floor((goo?.gooPerSec || 0) * 3600)}/h`}
                </span>
            ))}
            {author && (
                <span className="label">
                    <strong>AUTHOR:</strong> {author.addr}
                </span>
            )}
            {owner && (
                <span className="label">
                    <strong>OWNER:</strong> {owner.addr}
                </span>
            )}
        </Panel>
    );
};

const TileUndiscovered: FunctionComponent<unknown> = (_props) => {
    return (
        <Panel>
            <h3>Undiscovered Tile</h3>
            <span className="sub-title">You can&apos;t make out this tile. Scouting should help!</span>
        </Panel>
    );
};

interface TileAvailableProps {
    player?: ConnectedPlayer;
}
const TileAvailable: FunctionComponent<TileAvailableProps> = ({ player }) => {
    const { tiles: selectedTiles, mobileUnit: selectedMobileUnit } = useSelection();
    const selectedTile = selectedTiles?.[0];
    const tileMobileUnits = selectedTile?.mobileUnits ?? [];

    const excludeSelected = useCallback(
        (unit) => {
            if (!selectedMobileUnit) {
                return true;
            }
            return unit.id !== selectedMobileUnit.id;
        },
        [selectedMobileUnit]
    );

    const visibleUnits = tileMobileUnits.filter(excludeSelected);

    const lastTile = selectedTiles?.slice(-1, 1).find(() => true);
    if (!lastTile) {
        return null;
    }
    const { q, r, s } = getCoords(lastTile);
    const gooRates = getGooRates(lastTile);
    const topGooRate = gooRates.length > 0 ? Math.floor(gooRates[0].gooPerSec * 100) / 100 : 0;
    const topGooName = gooRates.length > 0 ? gooRates[0].name : '';
    const hasSomeGoo = topGooRate >= 0.1;
    const hasLotsGoo = topGooRate >= 0.3;
    const gooRatesInNameOrder = [GOO_RED, GOO_GREEN, GOO_BLUE]
        .map((idx) => gooRates.find((goo) => goo.index === idx))
        .filter((goo) => !!goo);

    const tileName = hasSomeGoo ? `${topGooName.toUpperCase()} GOO TILE` : `TILE`;
    const tileDescription = hasLotsGoo
        ? `A tile rich in ${topGooName} goo! ${topGooName} goo extractors will be very effective here`
        : hasSomeGoo
        ? `The tile has some ${topGooName} goo, extractors that need ${topGooName} goo will work well here`
        : undefined;

    return (
        <Panel>
            <h3 style={{ marginBottom: '2rem' }}>{tileName}</h3>
            <div className="description">{tileDescription}</div>
            {tileMobileUnits.length > 0 && (
                <MobileUnitList mobileUnits={visibleUnits} player={player} tile={selectedTile} />
            )}
            <span className="label" style={{ width: '100%' }}>
                <strong>COORDINATES:</strong> {`${q}, ${r}, ${s}`}
            </span>
            {gooRatesInNameOrder.map((goo) => (
                <span key={goo?.name} className="label" style={{ width: '30%' }}>
                    <strong>{goo?.name.toUpperCase().slice(0, 1)}:</strong>{' '}
                    {`${Math.floor((goo?.gooPerSec || 0) * 3600)}/h`}
                </span>
            ))}
        </Panel>
    );
};

export const TileInfoPanel = () => {
    const { selectIntent, tiles, mobileUnit, selectTiles } = useSelection();
    const player = usePlayer();

    const selectedTiles = tiles || [];

    const world = useWorld();
    const worldTiles = world?.tiles || ([] as WorldTileFragment[]);
    const selectedMobileUnitTile: WorldTileFragment | undefined = mobileUnit?.nextLocation?.tile
        ? worldTiles.find((t) => t.id === mobileUnit.nextLocation?.tile?.id)
        : undefined;

    const useableTiles = selectedMobileUnitTile
        ? getNeighbours(worldTiles, selectedMobileUnitTile)
              .concat([selectedMobileUnitTile])
              .filter((t): t is WorldTileFragment => !!t && t.biome === BiomeKind.DISCOVERED && !!t.building)
        : [];

    const selectedTile = selectedTiles?.slice(-1).find(() => true);

    if (selectedTile) {
        if (selectedTile.biome == BiomeKind.UNDISCOVERED) {
            return <TileUndiscovered />;
        } else if (!selectedTile.building) {
            return <TileAvailable player={player} />;
        } else if (selectedTile.building) {
            const canUse =
                useableTiles.length > 0 &&
                mobileUnit &&
                mobileUnit.nextLocation &&
                getTileDistance(mobileUnit.nextLocation.tile, selectedTile) < 2;
            return (
                <TileBuilding
                    canUse={!!canUse}
                    building={selectedTile.building}
                    world={world}
                    mobileUnit={mobileUnit}
                />
            );
        } else {
            return null; // fallback, don't expect this state
        }
    } else {
        return null;
    }
};
