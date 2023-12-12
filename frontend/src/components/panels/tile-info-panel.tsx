import {
    BagFragment,
    BiomeKind,
    BuildingKindFragment,
    CogAction,
    ConnectedPlayer,
    PluginType,
    PluginUpdateResponse,
    World,
    WorldBuildingFragment,
    WorldMobileUnitFragment,
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
    getNeighbours,
    getTileDistance,
} from '@app/helpers/tile';
import { useGameState, usePlayer, useSelection, useWorld } from '@app/hooks/use-game-state';
import { Bag } from '@app/plugins/inventory/bag';
import { useInventory } from '@app/plugins/inventory/inventory-provider';
import { TileInventory } from '@app/plugins/inventory/tile-inventory';
import { MobileUnitList } from '@app/plugins/mobile-unit-list';
import { getBagsAtEquipee, getBuildingAtTile, getMobileUnitsAtTile } from '@downstream/core/src/utils';
import { StyledHeaderPanel } from '@app/styles/base-panel.styles';
import { FunctionComponent, useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { colors } from '@app/styles/colors';
import { getMaterialStats } from '@app/plugins/combat/helpers';
import { getBuildingName, getLogicCellKind } from '@app/helpers/building';

enum LogicCellKind {
    NONE,
    START,
    LIQUIFY,
    SOLIDIFY,
    ADD,
    SUBTRACT,
    DIVIDE,
    REFINE,
    RESERVE,
    BUFFER,
}

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
    world?: World;
    kinds: BuildingKindFragment[];
    mobileUnit?: WorldMobileUnitFragment;
    ui: PluginUpdateResponse[];
}
const TileBuilding: FunctionComponent<TileBuildingProps> = ({ building, kinds, world, mobileUnit, ui, canUse }) => {
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

    const buildingBags = getBagsAtEquipee(world?.bags || [], building);
    const inputBag = buildingBags.find((b) => b.equipee?.key == 0);
    const outputBag = buildingBags.find((b) => b.equipee?.key == 1);

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
                                {inputBag && (
                                    <div ref={inputsRef} className="ingredients">
                                        <Bag
                                            bag={inputBag}
                                            bagId={inputBag.id}
                                            equipIndex={0}
                                            ownerId={building.id}
                                            isInteractable={canUse}
                                            showIcon={false}
                                            numBagSlots={1}
                                        />
                                    </div>
                                )}
                                {outputs.length > 0 && outputBag && (
                                    <div className="process">
                                        {/* <img src="/icons/downarrow.png" alt="output" className="arrow" /> */}
                                        <div className="arrow" />
                                    </div>
                                )}
                                {outputBag && (
                                    <div ref={outputsRef} className="ingredients">
                                        <Bag
                                            bag={outputBag}
                                            bagId={outputBag.id}
                                            equipIndex={1}
                                            ownerId={building.id}
                                            isInteractable={canUse}
                                            numBagSlots={1}
                                            showIcon={false}
                                        />
                                    </div>
                                )}
                            </>
                        )}
                    </PluginContent>
                )}
                {getLogicCellKind(building.kind) > 0 && (
                    <LogicCellPanel key={building.id} logicCell={building} world={world} />
                )}
                {selectedTile && <TileInventory tile={selectedTile} bags={world?.bags || []} />}
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
                <h3>Undiscovered Tile</h3>
            </div>
            <div className="content">
                <span className="sub-title">You can&apos;t make out this tile. Scouting should help!</span>
            </div>
        </StyledTileInfoPanel>
    );
};

interface TileAvailableProps {
    player?: ConnectedPlayer;
    mobileUnits: WorldMobileUnitFragment[];
    bags: BagFragment[];
}
const TileAvailable: FunctionComponent<TileAvailableProps> = ({ player, mobileUnits, bags }) => {
    const { tiles: selectedTiles, mobileUnit: selectedMobileUnit } = useSelection();
    const selectedTile = selectedTiles?.[0];
    const tileMobileUnits = selectedTile ? getMobileUnitsAtTile(mobileUnits, selectedTile) : [];

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
                <div className="description">{tileDescription}</div>
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

export const TileInfoPanel = ({ kinds, ui }: { kinds: BuildingKindFragment[]; ui: PluginUpdateResponse[] }) => {
    const { tiles, mobileUnit } = useSelection();
    const player = usePlayer();

    const selectedTiles = tiles || [];

    const world = useWorld();

    const selectedTile = selectedTiles?.slice(-1).find(() => true);

    if (selectedTile) {
        const building = getBuildingAtTile(world?.buildings || [], selectedTile);
        if (selectedTile.biome == BiomeKind.UNDISCOVERED) {
            return <TileUndiscovered />;
        } else if (!building) {
            return <TileAvailable player={player} mobileUnits={world?.mobileUnits || []} bags={world?.bags || []} />;
        } else if (building) {
            const canUse =
                mobileUnit &&
                mobileUnit.nextLocation &&
                getTileDistance(mobileUnit.nextLocation.tile, selectedTile) < 2;
            return (
                <TileBuilding
                    kinds={kinds}
                    canUse={!!canUse}
                    building={building}
                    world={world}
                    mobileUnit={mobileUnit}
                    ui={ui}
                />
            );
        } else {
            return null; // fallback, don't expect this state
        }
    } else {
        return null;
    }
};

export interface LogicCellPanelProps {
    logicCell: WorldBuildingFragment;
    world?: World;
}

export interface GooPipeConnection {
    fromLogicCell: string;
    outputIdx: number;
    toLogicCell: string;
    inputIdx: number;
}

export interface TriggerConnection {
    fromLogicCell: string;
    outputIdx: number;
    toLogicCell: string;
}

export const LogicCellPanel = ({ logicCell, world }: LogicCellPanelProps) => {
    const { tiles } = useGameState();
    const [gooConnections, setGooConnections] = useState<Record<string, GooPipeConnection>>({});
    const [triggerConnections, setTriggerConnections] = useState<Record<string, TriggerConnection>>({});
    const player = usePlayer();

    if (!player) {
        return null;
    }

    if (!world) {
        return null;
    }

    if (!tiles) {
        return null;
    }

    if (!logicCell.location) {
        return null;
    }

    const { buildings } = world;

    // Get adjacent logic cells
    // const neighbourTiles = getNeighbours(tiles, logicCell.location.tile);
    const neighbourLogicCells = buildings.filter(
        (b: WorldBuildingFragment) =>
            b.location &&
            logicCell.location &&
            getLogicCellKind(b.kind) > 0 &&
            getTileDistance(logicCell.location.tile, b.location.tile) < 6
    );

    function isTriggerConnected(
        logicCellFrom: WorldBuildingFragment,
        logicCellTo: WorldBuildingFragment,
        outputIdx: number
    ): boolean {
        return !!logicCellFrom.outputTriggers.find((t) => t.key == outputIdx && t.node.id == logicCellTo.id);
    }

    function isGooPipeConnected(
        logicCellFrom: WorldBuildingFragment,
        logicCellTo: WorldBuildingFragment,
        outputIdx: number,
        inputIdx: number
    ): boolean {
        return !!logicCellFrom.outputGooPipes.find(
            (gp) => gp.key == outputIdx && gp.node.id == logicCellTo.id && gp.inputIndex == inputIdx
        );
    }

    const handleGooOutputChange = (evt) => {
        evt.preventDefault();
        const [fromLogicCell, outputIdx, toLogicCell, inputIdx] = evt.target.value.split('/');
        const newConnections = { ...gooConnections };
        newConnections[`${fromLogicCell}/${outputIdx}`] = { fromLogicCell, outputIdx, toLogicCell, inputIdx };

        setGooConnections(newConnections);
    };

    const handleTriggerOutputChange = (evt) => {
        evt.preventDefault();
        const [fromLogicCell, outputIdx, toLogicCell] = evt.target.value.split('/');
        const newConnections = { ...triggerConnections };
        newConnections[`${fromLogicCell}/${outputIdx}`] = { fromLogicCell, outputIdx, toLogicCell };

        console.log(`newConnections:`, newConnections);

        setTriggerConnections(newConnections);
    };

    const handleGooConnectionSubmit = (evt) => {
        evt.preventDefault();

        // function CONNECT_GOO_PIPE(bytes24 from, bytes24 to, uint8 outIndex, uint8 inIndex) external;
        const actions = Object.keys(gooConnections).map((key) => {
            const { fromLogicCell, outputIdx, toLogicCell, inputIdx } = gooConnections[key];

            return {
                name: 'CONNECT_GOO_PIPE',
                args: [fromLogicCell, toLogicCell, outputIdx, inputIdx],
            } as CogAction;
        });

        player
            .dispatch(...actions)
            .then(() => setGooConnections({}))
            .catch((err) => {
                console.error('Goo pipe connection failed', err);
            });
    };

    const handleTriggerConnectionSubmit = (evt) => {
        evt.preventDefault();

        // function CONNECT_TRIGGER(bytes24 from, bytes24 to, uint8 triggerIndex) external;
        const actions = Object.keys(triggerConnections).map((key) => {
            const { fromLogicCell, outputIdx, toLogicCell } = triggerConnections[key];

            return {
                name: 'CONNECT_TRIGGER',
                args: [fromLogicCell, toLogicCell, outputIdx],
            } as CogAction;
        });

        player
            .dispatch(...actions)
            .then(() => setGooConnections({}))
            .catch((err) => {
                console.error('Trigger connection failed', err);
            });
    };

    return (
        <>
            {getCellOutputCount(getLogicCellKind(logicCell.kind)) > 0 && (
                <>
                    <h3>Goo Outputs</h3>
                    <form onSubmit={handleGooConnectionSubmit}>
                        {Array.from({ length: getCellOutputCount(getLogicCellKind(logicCell.kind)) }).map(
                            (_, outputIdx) => (
                                <div key={`output/${outputIdx}`}>
                                    <label>Output {outputIdx + 1} </label>
                                    <select id={`output/${outputIdx}`} onChange={handleGooOutputChange}>
                                        <option
                                            value={`${logicCell.id}/${outputIdx}/0x000000000000000000000000000000000000000000000000/0`}
                                        >
                                            Disconnected
                                        </option>
                                        {neighbourLogicCells.map((lc, cellIdx) =>
                                            Array.from({ length: getCellInputCount(getLogicCellKind(lc.kind)) }).map(
                                                (_, inputIdx) => {
                                                    // don't show the option if the input is connected to another cell
                                                    const isConnected = isGooPipeConnected(
                                                        logicCell,
                                                        lc,
                                                        outputIdx,
                                                        inputIdx
                                                    );

                                                    if (
                                                        lc.inputGooPipes.some(
                                                            (inputGooPipe) => inputGooPipe.inputIndex == inputIdx
                                                        ) &&
                                                        !isConnected
                                                    ) {
                                                        return null;
                                                    }

                                                    return (
                                                        <option
                                                            selected={isConnected}
                                                            key={`${cellIdx}/${inputIdx}`}
                                                            value={`${logicCell.id}/${outputIdx}/${lc.id}/${inputIdx}`}
                                                        >
                                                            {getBuildingName(lc)} : {inputIdx + 1}
                                                        </option>
                                                    );
                                                }
                                            )
                                        )}
                                    </select>
                                </div>
                            )
                        )}
                        <input type="submit" value="Apply" />
                    </form>
                </>
            )}

            {getCellTriggerCount(getLogicCellKind(logicCell.kind)) > 0 && (
                <>
                    <h3>Trigger Outputs</h3>
                    <form onSubmit={handleTriggerConnectionSubmit}>
                        {Array.from({ length: getCellTriggerCount(getLogicCellKind(logicCell.kind)) }).map(
                            (_, outputIdx) => (
                                <div key={`trigger/${outputIdx}`}>
                                    <label>Trigger {outputIdx + 1} </label>
                                    <select onChange={handleTriggerOutputChange}>
                                        <option
                                            value={`${logicCell.id}/${outputIdx}/0x000000000000000000000000000000000000000000000000`}
                                        >
                                            Disconnected
                                        </option>
                                        {neighbourLogicCells
                                            .filter((lc) => getLogicCellKind(lc.kind) == LogicCellKind.LIQUIFY)
                                            .map((lc, cellIdx) => {
                                                // don't show the option if the input is connected to another cell
                                                const isConnected = isTriggerConnected(logicCell, lc, outputIdx);

                                                if (
                                                    lc.inputTriggers.some(
                                                        (inputTrigger) => inputTrigger.node.id == logicCell.id
                                                    ) &&
                                                    !isConnected
                                                ) {
                                                    return null;
                                                }

                                                return (
                                                    <option
                                                        value={`${logicCell.id}/${outputIdx}/${lc.id}`}
                                                        selected={isConnected}
                                                        key={`trigger/${outputIdx}/${cellIdx}`}
                                                    >
                                                        {getBuildingName(lc)}
                                                    </option>
                                                );
                                            })}
                                    </select>
                                </div>
                            )
                        )}
                        <input type="submit" value="Apply" />
                    </form>
                </>
            )}
        </>
    );
};

// HACK: Obviously this should be defined somewhere. Could even go into the logicCell's ID

export const getCellInputCount = (kind: LogicCellKind) => {
    switch (kind) {
        case LogicCellKind.START:
            return 0;
        case LogicCellKind.LIQUIFY:
            return 0;
        case LogicCellKind.SOLIDIFY:
            return 1;
        case LogicCellKind.ADD:
            return 2;
        case LogicCellKind.SUBTRACT:
            return 2;
        case LogicCellKind.DIVIDE:
            return 1;
        case LogicCellKind.REFINE:
            return 1;
        case LogicCellKind.RESERVE:
            return 1;
        case LogicCellKind.BUFFER:
            return 1;

        default:
            return 0;
    }
};

export const getCellOutputCount = (kind: LogicCellKind) => {
    switch (kind) {
        case LogicCellKind.START:
            return 0;
        case LogicCellKind.LIQUIFY:
            return 1;
        case LogicCellKind.SOLIDIFY:
            return 0;
        case LogicCellKind.ADD:
            return 1;
        case LogicCellKind.SUBTRACT:
            return 1;
        case LogicCellKind.DIVIDE:
            return 2;
        case LogicCellKind.REFINE:
            return 3;
        case LogicCellKind.RESERVE:
            return 0;
        case LogicCellKind.BUFFER:
            return 1;

        default:
            return 0;
    }
};

export const getCellTriggerCount = (kind: LogicCellKind) => {
    switch (kind) {
        case LogicCellKind.START:
            return 6;

        default:
            return 0;
    }
};
