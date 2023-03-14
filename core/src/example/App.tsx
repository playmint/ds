import './App.css';

import CodeEditor from '@uiw/react-textarea-code-editor';
import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { Hexagon, HexGrid, Layout } from 'react-hexgrid';
import {
    BiomeKind,
    Client as DawnseekersClient,
    PluginStateComponent,
    PluginStateComponentContent,
    PluginStateComponentContentType,
    PluginStateButtonAction,
    PluginStateButtonToggle,
    PluginSubmitCallValues,
    PluginTrust,
    PluginType,
    State,
    Tile,
} from '@core';
import { useDawnseekersState } from '../react';
import examplePlugin from './plugins/tile';

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
                                selectedTile?.id == t.id ? 'selected' : '',
                            ].join(' ')}
                            q={t.coords.q}
                            r={t.coords.r}
                            s={t.coords.s}
                            onClick={() => clickTile(t)}
                        >
                            {seeker?.location.next.tile == t ? (
                                <polygon
                                    className="selectedSeeker"
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
type ToggleContentFunc = (contentID: string) => void;

const PluginContent = ({
    content,
    toggleContent,
}: {
    content: PluginStateComponentContent;
    toggleContent: ToggleContentFunc;
}) => {
    const saferHTML = { __html: content.html ? DOMPurify.sanitize(content.html) : '' };

    const submit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!content.submit) {
            return;
        }
        const formData = new FormData(e.currentTarget);
        const values: PluginSubmitCallValues = {};
        for (const entry of formData.entries()) {
            values[entry[0]] = entry[1].toString();
        }
        content.submit(values);
    };

    const clickActionButton = (btn: PluginStateButtonAction) => {
        btn.action(); // TODO: I think we should suspend here
    };

    const clickToggleButton = (btn: PluginStateButtonToggle) => {
        toggleContent(btn.content);
    };

    return (
        <div className="content">
            <form onSubmit={submit}>
                <div dangerouslySetInnerHTML={saferHTML} />
                {content.buttons?.map((btn) => {
                    switch (btn.type) {
                        case 'action':
                            return (
                                <button key={btn.text} onClick={() => clickActionButton(btn)}>
                                    {btn.text}
                                </button>
                            );
                        case 'toggle':
                            return (
                                <button key={btn.text} onClick={() => clickToggleButton(btn)}>
                                    {btn.text}
                                </button>
                            );
                        default:
                            return 'undefined';
                    }
                })}
            </form>
        </div>
    );
};

type PluginContentTypeMap = {
    [k in PluginStateComponentContentType]: string;
};

const PluginComponent = ({ component }: { component: PluginStateComponent }) => {
    const [contentIdForType, setContentIdForType] = useState<PluginContentTypeMap>({
        inline: 'default',
        popout: '',
        dialog: '',
    });

    const getVisibleContentForType = (
        type: PluginStateComponentContentType
    ): PluginStateComponentContent | undefined => {
        const activeID = contentIdForType[type];
        return component.content?.find((c) => c.id === activeID);
    };

    const toggleContent: ToggleContentFunc = (reqContentId) => {
        const content = component.content?.find((c) => c.id === reqContentId);
        if (!content) {
            return;
        }
        const prevContentId = contentIdForType[content.type];
        let nextContentId = reqContentId;
        if (prevContentId === nextContentId || nextContentId === '') {
            if (content.type === 'inline') {
                // inline is special, default back to default content
                nextContentId = 'default';
            } else {
                // hide the content area
                nextContentId = '';
            }
        } else {
            nextContentId = content.id;
        }

        setContentIdForType({ ...contentIdForType, [content.type]: nextContentId });
    };

    const inline = getVisibleContentForType('inline');
    const popout = getVisibleContentForType('popout');
    // const dialog = getVisibleContentForType('dialog');

    return (
        <table className="component" style={{ marginTop: '50px', border: '1px solid black', width: '100%' }}>
            <tbody>
                <tr>
                    <td>title</td>
                    <td>{component.title}</td>
                </tr>
                <tr>
                    <td>type</td>
                    <td>{component.type}</td>
                </tr>
                <tr>
                    <td>inline:</td>
                    <td>
                        {inline ? (
                            <PluginContent content={inline} toggleContent={toggleContent} />
                        ) : (
                            <div>no visible content</div>
                        )}
                    </td>
                </tr>
                <tr>
                    <td>popout:</td>
                    <td>
                        {popout ? (
                            <PluginContent content={popout} toggleContent={toggleContent} />
                        ) : (
                            <div>no visible content</div>
                        )}
                    </td>
                </tr>
            </tbody>
        </table>
    );
};

const PluginEditor = ({ ds }: { ds: DawnseekersClient }) => {
    const [code, setCode] = useState(examplePlugin);
    const update = () => {
        ds.load({
            id: 'test',
            type: PluginType.CORE,
            trust: PluginTrust.TRUSTED,
            src: code,
        });
    };
    useEffect(() => update, []);
    return (
        <div>
            <CodeEditor
                value={code}
                language="js"
                placeholder="Please enter JS code."
                onChange={(evn) => setCode(evn.target.value)}
                padding={15}
                style={{
                    fontSize: 12,
                    fontFamily: 'ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace',
                    overflow: 'auto',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: '35px',
                }}
                data-color-mode="dark"
            />
            <button
                style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: '35px' }}
                onClick={update}
            >
                Load Plugin
            </button>
        </div>
    );
};

const App = ({ ds }: { ds: DawnseekersClient }) => {
    const { data } = useDawnseekersState(ds);
    const player = data?.ui.selection.player;

    return (
        <div className="App">
            <div className="mapnav">{data ? <HexMap state={data} ds={ds} /> : undefined}</div>
            <div className="topnav">
                <button className="topnav-button" onClick={() => ds.signin()}>
                    {player ? player.id.slice(0, 10) + '...' : 'signin'}
                </button>
            </div>
            <div className="editor">
                <PluginEditor ds={ds} />
            </div>
            <div className="components">
                {data?.ui.plugins
                    .flatMap((p) => p.components)
                    .map((c) => (
                        <PluginComponent key={c.id} component={c} />
                    ))}
            </div>
        </div>
    );
};

export default App;
