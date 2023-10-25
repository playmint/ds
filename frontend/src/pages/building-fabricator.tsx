/** @format */
import { FactoryBuilding } from '@app/components/map/FactoryBuilding';
import { GroundPlane } from '@app/components/map/GroundPlane';
import { Tile } from '@app/components/map/Tile';
import { getItemStructure } from '@app/helpers';
import { useConfig } from '@app/hooks/use-config';
import { GameStateProvider, useWorld } from '@app/hooks/use-game-state';
import { SessionProvider } from '@app/hooks/use-session';
import { UnityMapProvider, useUnityMap } from '@app/hooks/use-unity-map';
import { WalletProviderProvider } from '@app/hooks/use-wallet-provider';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';
import { BuildingKindFactorySpec } from '@downstream/cli/utils/manifest';
import { ItemFragment } from '@downstream/core/src/gql/graphql';
import { useCallback, useMemo, useState } from 'react';
import styled from 'styled-components';
import { z } from 'zod';
import YAML from 'yaml';

const toStringDefaults = { indentSeq: false };

const toYAML = (o: any): string => {
    const doc = new YAML.Document(o, { toStringDefaults });
    const specField: any = doc.get('spec');
    if (specField) {
        const locField: any = specField.get('location');
        if (locField) {
            locField.flow = true; // always inline coords
        }
    }
    return doc.toString();
};

const Content = ({ children }: { name: string; children: any }) => {
    return children;
};

const GroupedContent = ({ children, initial }) => {
    const [active, setActive] = useState<string>(initial);
    return (
        <div>
            <div style={{ display: 'flex', flexDirection: 'row' }}>
                {children.map((child) => (
                    <div
                        style={{ margin: 5 }}
                        key={child.props.name}
                        className="tab"
                        onClick={() => setActive(child.props.name)}
                    >
                        {child.props.name}
                    </div>
                ))}
            </div>
            <div>
                {children.map((child) => (
                    <div
                        key={child.props.name}
                        style={{ display: child.props.name === active ? 'block' : 'none' }}
                        className="content"
                    >
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
};

const ConstructMaterial = ({ name, quantity, onChangeQuantity }) => {
    return (
        <div>
            Material {name}
            <input type="range" min={1} max={100} value={quantity} onChange={onChangeQuantity} />
        </div>
    );
};

const InputItem = ({
    name,
    quantity,
    onChangeItemName,
    onChangeQuantity,
    items,
}: {
    name: string;
    quantity: number;
    items: ItemFragment[];
    onChangeItemName: (name: string) => void;
    onChangeQuantity: (n: number) => void;
}) => {
    const _onChangeQuanity = useCallback((e) => onChangeQuantity(e.target.value), [onChangeQuantity]);
    const _onChangeItemName = useCallback((e) => onChangeItemName(e.target.value), [onChangeItemName]);
    const selectedItem = items.find((item) => item.name?.value === name);
    const [_stackable, greenGoo, blueGoo, redGoo] = selectedItem ? getItemStructure(selectedItem.id) : [false, 0, 0, 0];
    const qty = selectedItem ? quantity : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap' }}>
            <select
                style={{ display: 'block' }}
                onChange={_onChangeItemName}
                value={selectedItem?.name?.value || '__none__'}
            >
                <option value="__none__">None</option>
                {items.map((item) => (
                    <option key={item.id} value={item.name?.value || '__none__'}>
                        {item.name?.value || ''}
                    </option>
                ))}
            </select>
            <input
                style={{ display: 'block' }}
                type="range"
                min={0}
                max={100}
                value={qty}
                onChange={_onChangeQuanity}
            />
            <div>R:{redGoo * qty}</div>
            <div>G:{greenGoo * qty}</div>
            <div>B:{blueGoo * qty}</div>
        </div>
    );
};

const FACTORY_TOPS = Array.from({ length: 17 }, (_, i) => i + 1).map((n) => (n < 10 ? `0${n}` : `${n}`));
const FACTORY_BOTTOMS = Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (n < 10 ? `0${n}` : `${n}`));
const PALLETE = ['blue', 'pink', 'yellow', 'green', 'red', 'purple'];

const StyledBuildingFabricator = styled.div`
    display: flex;
    flex-direction: row;
    flex-wrap: nowrap;
    justify-content: flex-start;
    align-items: stretch;
    align-content: stretch;
    position: relative;
    z-index: 99;
    color: white;
`;

const BuildingFabricator = () => {
    const { ready: mapReady } = useUnityMap();
    const [spec, setSpec] = useState<z.infer<typeof BuildingKindFactorySpec>>({
        category: 'factory',
        name: 'x',
        description: 'x',
        model: '01-01',
        color: 0,
        contract: { file: './basic-factory.sol' },
        plugin: { file: './basic-factory.js' },
        materials: [
            { name: 'Red Goo', quantity: 50 },
            { name: 'Green Goo', quantity: 50 },
            { name: 'Blue Goo', quantity: 50 },
        ],
        inputs: [
            { name: '', quantity: 0 },
            { name: '', quantity: 0 },
            { name: '', quantity: 0 },
            { name: '', quantity: 0 },
        ],
        outputs: [{ name: 'x', quantity: 1 }],
    });
    const world = useWorld();
    const availableItems = world?.items || [];
    const coords = useMemo(() => ({ q: 0, r: 0, s: 0 }), []);
    const model = spec.model;
    const height = 0.05;

    const onChangeBuildingName = useCallback(
        (e) =>
            setSpec((spec) => {
                spec.name = e.target.value;
                return { ...spec };
            }),
        []
    );
    const onChangeBuildingDescription = useCallback(
        (e) =>
            setSpec((spec) => {
                spec.description = e.target.value;
                return { ...spec };
            }),
        []
    );
    const onChangeBuildingColor = useCallback(
        (c: number) =>
            setSpec((spec) => {
                spec.color = c;
                return { ...spec };
            }),
        []
    );
    const onChangeOutputName = useCallback(
        (e) =>
            setSpec((spec) => {
                spec.outputs = [{ name: e.target.value, quantity: 1 }];
                return { ...spec };
            }),
        []
    );
    const onChangeConstructQuantity = useCallback(
        (idx, e) =>
            setSpec((spec) => {
                spec.materials[idx].quantity = e.target.value;
                return { ...spec };
            }),
        []
    );
    const onChangeInputQuantity = useCallback(
        (idx: number, n: number) =>
            setSpec((spec) => {
                if (!spec.inputs) {
                    spec.inputs = [];
                }
                spec.inputs[idx].quantity = n;
                return { ...spec };
            }),
        []
    );
    const onChangeInputName = useCallback(
        (idx: number, name: string) =>
            setSpec((spec) => {
                if (!spec.inputs) {
                    spec.inputs = [];
                }
                spec.inputs[idx].name = name;
                return { ...spec };
            }),
        []
    );
    const nextTop = useCallback(() => {
        const [modelBottom, modelTop] = model.split('-');
        const idx = FACTORY_TOPS.findIndex((part) => part === modelTop) || 0;
        const newTop = FACTORY_TOPS[idx + 1 === FACTORY_TOPS.length ? 0 : idx + 1];
        setSpec((spec) => {
            spec.model = `${modelBottom}-${newTop}`;
            return { ...spec };
        });
    }, [model]);
    const prevTop = useCallback(() => {
        const [modelBottom, modelTop] = model.split('-');
        const idx = FACTORY_TOPS.findIndex((part) => part === modelTop) || 0;
        const newTop = FACTORY_TOPS[idx === 0 ? FACTORY_TOPS.length - 1 : idx - 1];
        setSpec((spec) => {
            spec.model = `${modelBottom}-${newTop}`;
            return { ...spec };
        });
    }, [model]);
    const nextBottom = useCallback(() => {
        const [modelBottom, modelTop] = model.split('-');
        const idx = FACTORY_BOTTOMS.findIndex((part) => part === modelBottom) || 0;
        const newBottom = FACTORY_BOTTOMS[idx + 1 === FACTORY_BOTTOMS.length ? 0 : idx + 1];
        setSpec((spec) => {
            spec.model = `${newBottom}-${modelTop}`;
            return { ...spec };
        });
    }, [model]);
    const prevBottom = useCallback(() => {
        const [modelBottom, modelTop] = model.split('-');
        const idx = FACTORY_BOTTOMS.findIndex((part) => part === modelBottom) || 0;
        const newBottom = FACTORY_BOTTOMS[idx === 0 ? FACTORY_BOTTOMS.length - 1 : idx - 1];
        setSpec((spec) => {
            spec.model = `${newBottom}-${modelTop}`;
            return { ...spec };
        });
    }, [model]);

    const getExportURL = () => {
        const exportable = [
            {
                kind: 'BuildingKind',
                spec,
            },
        ];
        const data = `${exportable.length > 0 ? '\n---\n' : ''}${exportable.map(toYAML).join('\n---\n')}`;
        const blob = new Blob([data], { type: 'application/x-yaml' });
        return URL.createObjectURL(blob);
    };

    const downloadFiles = () => {
        window.location.replace(getExportURL());
    };

    console.log(spec.model, spec.color);
    return (
        <StyledBuildingFabricator>
            <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', flexWrap: 'nowrap' }}>
                <div>Building Configurator</div>
                <GroupedContent initial="Details">
                    <Content name="Details">
                        <fieldset>
                            <legend>Building Name</legend>
                            <input type="text" value={spec.name} onChange={onChangeBuildingName} />
                        </fieldset>
                        <fieldset>
                            <legend>Building Description</legend>
                            <input type="text" value={spec.description} onChange={onChangeBuildingDescription} />
                        </fieldset>
                        {spec.materials.map((material, idx) => (
                            <ConstructMaterial
                                key={idx}
                                name={material.name}
                                quantity={material.quantity}
                                onChangeQuantity={(e) => onChangeConstructQuantity(idx, e)}
                            />
                        ))}
                    </Content>
                    <Content name="Item">
                        <fieldset>
                            <legend>Item Name</legend>
                            <input
                                type="text"
                                value={(spec.outputs || []).find(() => true)?.name || ''}
                                onChange={onChangeOutputName}
                            />
                        </fieldset>
                        {(spec.inputs || []).map((input, idx) => (
                            <InputItem
                                key={idx}
                                name={input.name}
                                quantity={input.quantity}
                                onChangeItemName={(name: string) => onChangeInputName(idx, name)}
                                onChangeQuantity={(n: number) => onChangeInputQuantity(idx, n)}
                                items={availableItems}
                            />
                        ))}
                    </Content>
                </GroupedContent>
            </div>
            <div style={{}}>
                {mapReady && (
                    <>
                        <div>
                            <button onClick={prevTop}>prev top</button>
                            <button onClick={nextTop}>next top</button>
                        </div>
                        <div>
                            <GroundPlane height={-0.1} />
                            <Tile id={'plinth'} height={height} color="#7288A6" {...coords} />
                            <FactoryBuilding
                                id={`new-build`}
                                height={height}
                                model={`${spec.model}-${spec.color}`}
                                rotation={-30}
                                selected={'none'}
                                {...coords}
                            />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'row' }}>
                            {[0, 1, 2, 3, 4, 5, 6].map((c) => (
                                <button key={c} onClick={() => onChangeBuildingColor(c)}>
                                    <div style={{ width: 30, height: 30, backgroundColor: PALLETE[c] }}> </div>
                                </button>
                            ))}
                        </div>
                        <div>
                            <button onClick={prevBottom}>prev bottom</button>
                            <button onClick={nextBottom}>next bottom</button>
                        </div>
                        <div>
                            <button onClick={downloadFiles}>Export</button>
                        </div>
                    </>
                )}
            </div>
        </StyledBuildingFabricator>
    );
};

export default function ShellPage() {
    const config = useConfig();

    return (
        <UnityMapProvider>
            <WalletProviderProvider>
                <GameStateProvider config={config}>
                    <SessionProvider>
                        <InventoryProvider>
                            <BuildingFabricator />
                            {config && <div className="build-version">build v0.1-{config.commit}</div>}
                        </InventoryProvider>
                    </SessionProvider>
                </GameStateProvider>
            </WalletProviderProvider>
        </UnityMapProvider>
    );
}
