import {
    BagFragment,
    BiomeKind,
    BuildingKindFragment,
    ConnectedPlayer,
    PluginType,
    PluginUpdateResponse,
    WorldBuildingFragment,
    WorldMobileUnitFragment,
    ZoneWithBags,
} from '@app/../../core/src';
import { PluginContent } from '@app/components/organisms/tile-action';
import {
    GOO_BIG_THRESH,
    GOO_BLUE,
    GOO_GREEN,
    GOO_RED,
    GOO_SMALL_THRESH,
    getCoords,
    getGooRates,
    getTileDistance,
} from '@app/helpers/tile';
import { useBlock, usePlayer, useSelection, useZone } from '@app/hooks/use-game-state';
import { Bag } from '@app/plugins/inventory/bag';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { TileInventory } from '@app/plugins/inventory/tile-inventory';
import { MobileUnitList } from '@app/plugins/mobile-unit-list';
import { getBagsAtEquipee, getBuildingAtTile, getMobileUnitsAtTile } from '@downstream/core/src/utils';
import { StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { FunctionComponent, useCallback, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { colors } from '@app/styles/colors';
import { getMaterialStats } from '@app/plugins/combat/helpers';

interface KeyedThing {
    key: number;
}

const byKey = (a: KeyedThing, b: KeyedThing) => {
    return a.key > b.key ? 1 : -1;
};

const StyledTileInfoPanel = styled(StyledHeaderPanel)`
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
        height: 3.2rem;
        text-overflow: hidden;

        > .arrow {
            display: inline-block;
            width: 3.2rem;
            height: 3.2rem;
            mask-image: url('/icons/downarrow.png');
            mask-size: 100%;
            background-color: ${colors.orange_0};
        }
    }
    /* img.arrow {
        display: inline-block;
        width: 32px;
    } */

    form {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;

        .ingredients {
            margin: 0 auto;
        }
    }

    > .content > .label {
        width: 12rem;
        line-height: 1rem;
        white-space: nowrap;
        font-size: 1.2rem;
        overflow: hidden;
        text-overflow: ellipsis;
        display: inline-block;
        opacity: 0.4;
    }
`;

interface TileBuildingProps {
    canUse: boolean;
    building: WorldBuildingFragment;
    zone?: ZoneWithBags;
    kinds: BuildingKindFragment[];
    mobileUnit?: WorldMobileUnitFragment;
    ui: PluginUpdateResponse[];
}
const TileBuilding: FunctionComponent<TileBuildingProps> = ({ building, kinds, zone, mobileUnit, ui, canUse }) => {
    const { tiles: selectedTiles } = useSelection();
    const selectedTile = selectedTiles?.[0];
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

    const buildingBags = getBagsAtEquipee(zone?.bags || [], building);
    const inputBag = buildingBags.find((b) => b.equipee?.key == 0);
    const outputBag = buildingBags.find((b) => b.equipee?.key == 1);

    const author = building?.kind?.owner?.addr || 'unknown';
    const owner = building?.owner?.addr || 'unknown';

    const name = building?.kind?.name?.value ?? 'Unnamed Building';
    const description = building?.kind?.description?.value;

    const content = (component?.content || []).find((c) => {
        if (mobileUnit) {
            return c.id === 'use' || c.id === 'default';
        }
        return c.id === 'view';
    });

    const [life, def, atk] = getMaterialStats(buildingKind?.materials || []);

    return (
        <StyledTileInfoPanel>
            <div className="header">
                <h3>{name}</h3>
                {description && <span className="sub-title">{description}</span>}
            </div>
            <div className="content">
                {content && (
                    <PluginContent canUse={canUse} content={content}>
                        {mobileUnit && (
                            <>
                                {inputs.length > 0 && inputBag && (
                                    <div ref={inputsRef} className="ingredients">
                                        <Bag
                                            bag={inputBag}
                                            bagId={inputBag.id}
                                            equipIndex={0}
                                            ownerId={building.id}
                                            isInteractable={canUse}
                                            recipe={inputs}
                                            numBagSlots={inputs.length}
                                            showIcon={false}
                                        />
                                    </div>
                                )}
                                {outputs.length > 0 && outputBag && (
                                    <div className="process">
                                        {/* <img src="/icons/downarrow.png" alt="output" className="arrow" /> */}
                                        <div className="arrow" />
                                    </div>
                                )}
                                {outputs.length > 0 && outputBag && (
                                    <div ref={outputsRef} className="ingredients">
                                        <Bag
                                            bag={outputBag}
                                            bagId={outputBag.id}
                                            equipIndex={1}
                                            ownerId={building.id}
                                            isInteractable={canUse}
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
                {selectedTile && <TileInventory tile={selectedTile} bags={zone?.bags || []} />}
                <span className="label" style={{ marginTop: '2rem' }}>
                    <strong>AUTHOR:</strong> {author}
                </span>
                {owner && (
                    <span className="label">
                        <strong>OWNER:</strong> {owner}
                    </span>
                )}
                <span className="label" style={{ width: '30%' }}>
                    <strong>ATK:</strong> {atk > 99999 ? 'MAX' : atk}
                </span>
                <span className="label" style={{ width: '30%' }}>
                    <strong>DEF:</strong> {def > 99999 ? 'MAX' : def}
                </span>
                <span className="label" style={{ width: '30%' }}>
                    <strong>LIFE:</strong> {life > 99999 ? 'MAX' : life}
                </span>
            </div>
        </StyledTileInfoPanel>
    );
};

const TileUndiscovered: FunctionComponent<unknown> = (_props) => {
    return (
        <StyledTileInfoPanel>
            <div className="header">
                <h3>Empty Tile</h3>
            </div>
        </StyledTileInfoPanel>
    );
};

interface TileAvailableProps {
    player?: ConnectedPlayer;
    mobileUnits: WorldMobileUnitFragment[];
    bags: BagFragment[];
    unitTimeoutBlocks: number;
}
const TileAvailable: FunctionComponent<TileAvailableProps> = ({ player, mobileUnits, bags, unitTimeoutBlocks }) => {
    const { tiles: selectedTiles, mobileUnit: selectedMobileUnit } = useSelection();
    const selectedTile = selectedTiles?.[0];
    const tileMobileUnits = selectedTile ? getMobileUnitsAtTile(mobileUnits, selectedTile) : [];
    const blockNumber = useBlock();
    const currentBlock = blockNumber || 0;

    const excludeSelected = useCallback(
        (unit) => {
            if (!selectedMobileUnit) {
                return true;
            }
            return unit.id !== selectedMobileUnit.id;
        },
        [selectedMobileUnit]
    );

    const visibleUnits = tileMobileUnits
        .filter(excludeSelected)
        .filter((u) => currentBlock - (u.nextLocation?.time || 0) < unitTimeoutBlocks);

    const lastTile = selectedTiles?.slice(-1, 1).find(() => true);
    if (!lastTile) {
        return null;
    }
    const { q, r, s } = getCoords(lastTile);
    const gooRates = getGooRates(lastTile);
    // const topGooRate = gooRates.length > 0 ? Math.floor(gooRates[0].gooPerSec * 100) / 100 : 0;
    const topGooWeight = gooRates.length > 0 ? gooRates[0].weight : 0;
    const topGooName = gooRates.length > 0 ? gooRates[0].name : '';
    const hasSomeGoo = topGooWeight >= GOO_SMALL_THRESH;
    const hasLotsGoo = topGooWeight >= GOO_BIG_THRESH;
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
        <StyledTileInfoPanel>
            <div className="header">
                <h3>{tileName}</h3>
                <div className="sub-title">{tileDescription}</div>
            </div>
            <div className="content">
                {tileMobileUnits.length > 0 && (
                    <MobileUnitList mobileUnits={visibleUnits} player={player} tile={selectedTile} bags={bags} />
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
            </div>
        </StyledTileInfoPanel>
    );
};

export const TileInfoPanel = ({
    kinds,
    ui,
    unitTimeoutBlocks,
}: {
    kinds: BuildingKindFragment[];
    ui: PluginUpdateResponse[];
    unitTimeoutBlocks;
}) => {
    const { tiles, mobileUnit } = useSelection();
    const player = usePlayer();

    const selectedTiles = tiles || [];

    const zone = useZone();

    const selectedTile = selectedTiles?.slice(-1).find(() => true);

    if (selectedTile) {
        const building = getBuildingAtTile(zone?.buildings || [], selectedTile);
        if (selectedTile.biome == BiomeKind.UNDISCOVERED) {
            return <TileUndiscovered />;
        } else if (!building) {
            return (
                <TileAvailable
                    player={player}
                    mobileUnits={zone?.mobileUnits || []}
                    bags={zone?.bags || []}
                    unitTimeoutBlocks={unitTimeoutBlocks}
                />
            );
        } else if (building) {
            const canUse =
                mobileUnit &&
                mobileUnit.nextLocation &&
                getTileDistance(mobileUnit.nextLocation.tile, selectedTile) < 2;
            return (
                <>
                    <TileBuilding
                        kinds={kinds}
                        canUse={!!canUse}
                        building={building}
                        zone={zone}
                        mobileUnit={mobileUnit}
                        ui={ui}
                    />
                    <TileAvailable
                        player={player}
                        mobileUnits={zone?.mobileUnits || []}
                        bags={zone?.bags || []}
                        unitTimeoutBlocks={unitTimeoutBlocks}
                    />
                </>
            );
        } else {
            return null; // fallback, don't expect this state
        }
    } else {
        return null;
    }
};
