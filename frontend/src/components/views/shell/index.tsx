/** @format */

import { FunctionComponent } from 'react';
import styled from 'styled-components';
import { HexGrid, Layout, Hexagon } from 'react-hexgrid';
import { ComponentProps } from '@app/types/component-props';
import { styles } from './shell.styles';
import React from 'react';
import {
    BiomeKind,
    DawnseekersClient,
    PluginTrust,
    PluginType,
    State,
    Tile,
    useDawnSeekersState
} from '@app/contexts/dawnseekers-provider';
import { TileAction } from '@app/components/organisms/tile-action';
import movePlugin from '@app/plugins/move';
import scoutPlugin from '@app/plugins/scout';
import { formatPlayerId, formatSeekerKey } from '@app/helpers';

const ds = new DawnseekersClient({
    wsEndpoint: 'ws://localhost:8080/query',
    httpEndpoint: 'http://localhost:8080/query',
    autoloadablePlugins: [
        // this would be fetched from cog-services
        {
            type: PluginType.BUILDING,
            trust: PluginTrust.UNTRUSTED,
            addr: 'my-building-kind-addr',
            src: ``
        }
    ],
    corePlugins: []
});
(window as any).ds = ds;

// load a plugin
ds.load(movePlugin);
ds.load(scoutPlugin);
ds.load({
    type: PluginType.CORE,
    trust: PluginTrust.TRUSTED,
    addr: '',
    src: `
        class Plugin {
            state = {};

            constructor(ds) {
                this.ds = ds;
            }

            onState(state) {
                this.state = state;
            }

            onClick(e) {
                
            }

            onSubmit(e, values) {
                
            }

            showTileActionDetails() {
                return false;
            }

            renderTileActionButtons() {
                return '<h3 style="width: 100%;text-transform: uppercase">The sword smith</h3><span class="strapline" style="width: 100%;margin-bottom:10px">Finely honed steel</span><img src="/building-with-flag.png" style="display:block;margin: 10px auto;position:relative;left:-9px;" alt="" /><button class="action-button">Enter</button>';
            }

            renderTileActionDetails() {
                return '';
            }
        }
`
});

// ds.load({
//     type: PluginType.CORE,
//     trust: PluginTrust.TRUSTED,
//     addr: '',
//     src: `
//         class Plugin {
//             state = {};
//             showActionDetails = false;
//             dispatching = false;
//
//             constructor(ds) {
//                 this.ds = ds;
//             }
//
//             onState(state) {
//                 this.state = state;
//             }
//
//             onClick(e) {
//                 this.showActionDetails = true;
//             }
//
//             onSubmit(e, values) {
//                 const seeker = this.state.ui.selection.seeker;
//                 this.dispatching = true;
//                 this.ds.dispatch('MOVE_SEEKER', values.sid, values.q, values.r, values.s)
//                     .finally(() => this.dispatching = false)
//             }
//
//             showTileActionDetails() {
//                 return this.showActionDetails;
//             }
//
//             renderTileActionButtons() {
//                 const selectedSeeker = this.state.ui.selection.seeker;
//                 if (!selectedSeeker) {
//                     return 'cant do anything, no seeker';
//                 }
//                 return '<div>seeker '+selectedSeeker.key+'</div><img src="https://cdn-icons-png.flaticon.com/512/42/42877.png" width="40"/><button id="craftbtn1" class="action-button">TILE ACTION</button>';
//             }
//
//             renderTileActionDetails() {
//                 if (this.dispatching) {
//                     return 'sending';
//                 }
//                 const selectedSeeker = this.state.ui.selection.seeker;
//                 if (!selectedSeeker) {
//                     return 'cant do anything, no seeker';
//                 }
//                 return ' <form id="craft"><input type="number" name="sid" value="'+selectedSeeker.key+'"><input type="number" name="q" value="'+selectedSeeker.location.next.tile.coords.q+'"><input type="number" name="r" value="'+selectedSeeker.location.next.tile.coords.r+'"><input type="number" name="s" value="'+selectedSeeker.location.next.tile.coords.s+'"><button id="craftbtn2" class="action-button">DISPATCH</button> </form>';
//             }
//         }
// `
// });

const HexMap = ({ state, ds }: { state: State; ds: DawnseekersClient }) => {
    const { game, ui } = state;
    const seeker = ui.selection.seeker;
    const selectedTiles = ui.selection.tiles;
    const selectedTile = selectedTiles && selectedTiles.length > 0 ? selectedTiles[0] : null;

    const clickTile = (t: Tile) => {
        ds.selectTiles([t.id]);
    };

    return (
        <div>
            <HexGrid width={1200} height={800} viewBox="-50 -50 100 100">
                <Layout size={{ x: 5, y: 5 }} flat={false} spacing={1.05} origin={{ x: 0, y: 0 }}>
                    {game.tiles.map((t) => (
                        <Hexagon
                            key={t.id}
                            className={[
                                t.biome == BiomeKind.DISCOVERED ? 'scouted' : 'unscouted',
                                selectedTile?.id == t.id ? 'selected' : ''
                            ].join(' ')}
                            q={t.coords.q}
                            r={t.coords.r}
                            s={t.coords.s}
                            onClick={() => clickTile(t)}
                        >
                            {seeker?.location.next.tile == t ? (
                                <polygon
                                    className="selected-seeker"
                                    points="50 15, 100 100, 0 100"
                                    transform="scale(0.01)"
                                />
                            ) : undefined}
                        </Hexagon>
                    ))}
                </Layout>
            </HexGrid>
        </div>
    );
};

export interface ShellProps extends ComponentProps {}

const StyledShell = styled('div')`
    ${styles}
`;

export const Shell: FunctionComponent<ShellProps> = (props: ShellProps) => {
    const { ...otherProps } = props;
    const { data } = useDawnSeekersState(ds);
    const player = data?.ui.selection.player;

    return (
        <StyledShell {...otherProps}>
            <div className="mapnav">{data && <HexMap state={data} ds={ds} />}</div>
            <div className="topnav">
                <button className="topnav-button" onClick={() => ds.signin()}>
                    <img src="/icons/player.png" alt="" />
                    <span className="text">{player ? `Player ${formatPlayerId(player.id)}` : 'Sign in'}</span>
                </button>
            </div>
            <div className="seeker-actions">
                <div className="action seeker-selector">
                    <img src="/seeker-shield-large.png" className="shield" alt="" />
                    <div className="controls">
                        <button className="icon-button">
                            <img src="/icons/prev.png" alt="Previous" />
                        </button>
                        <span className="label">
                            Seeker #{formatSeekerKey(data?.ui.selection.seeker?.key.toString() || '')}
                        </span>
                        <button className="icon-button">
                            <img src="/icons/next.png" alt="Next" />
                        </button>
                    </div>
                </div>
            </div>
            <div className="tile-actions">
                {data?.ui.plugins
                    .filter((p) => p.tileActionButton || p.tileActionDetails)
                    .map((p) => (
                        <TileAction
                            client={ds}
                            key={p.id}
                            id={p.id}
                            buttonHTML={p.tileActionButton}
                            detailsHTML={p.tileActionDetails}
                            showDetails={p.showTileActionDetails}
                            className="action"
                        />
                    ))}
            </div>
        </StyledShell>
    );
};
export default Shell;
