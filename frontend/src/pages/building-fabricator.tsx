/** @format */
import { BuilderCamera } from '@app/components/map/BuilderCamera';
import { FactoryBuilding } from '@app/components/map/FactoryBuilding';
import { GroundPlane } from '@app/components/map/GroundPlane';
import { Tile } from '@app/components/map/Tile';
import { NavPanel } from '@app/components/panels/nav-panel';
import { getItemStructure } from '@app/helpers';
import { useConfig } from '@app/hooks/use-config';
import { GameStateProvider, useBuildingKinds, usePlayer, useWorld } from '@app/hooks/use-game-state';
import useResizeObserver from '@app/hooks/use-resize-observer';
import { SessionProvider } from '@app/hooks/use-session';
import { UnityMapProvider, useUnityMap } from '@app/hooks/use-unity-map';
import { WalletProviderProvider } from '@app/hooks/use-wallet-provider';
import { BagItem } from '@app/plugins/inventory/bag-item';
import { iconURL } from '@app/plugins/inventory/helpers';
import { InventoryProvider } from '@app/plugins/inventory/inventory-provider';
import { encodeItemID, getOpsForManifests } from '@downstream/cli/utils/applier';
import { Manifest, BuildingKindFactorySpec, parseManifestDocuments } from '@downstream/cli/utils/manifest';
import { ItemFragment } from '@downstream/core/src/gql/graphql';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';
import YAML from 'yaml';
import { z } from 'zod';

const StripeySpacer = ({ height }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="250" height="88" viewBox="0 0 250 88" fill="none" style={{ height }}>
        <g clip-path="url(#clip0_531_354)">
            <rect
                x="22.1807"
                y="-37.9473"
                width="19.25"
                height="178.135"
                transform="rotate(30 22.1807 -37.9473)"
                fill="#CFCBD7"
            />
            <rect
                x="61.9189"
                y="-37.9473"
                width="19.25"
                height="178.135"
                transform="rotate(30 61.9189 -37.9473)"
                fill="#CFCBD7"
            />
            <rect
                x="101.657"
                y="-37.9473"
                width="19.25"
                height="178.135"
                transform="rotate(30 101.657 -37.9473)"
                fill="#CFCBD7"
            />
            <rect
                x="141.396"
                y="-37.9473"
                width="19.25"
                height="178.135"
                transform="rotate(30 141.396 -37.9473)"
                fill="#CFCBD7"
            />
            <rect
                x="181.134"
                y="-37.9473"
                width="19.25"
                height="178.135"
                transform="rotate(30 181.134 -37.9473)"
                fill="#CFCBD7"
            />
            <rect
                x="220.872"
                y="-37.9473"
                width="19.25"
                height="178.135"
                transform="rotate(30 220.872 -37.9473)"
                fill="#CFCBD7"
            />
            <rect
                x="260.61"
                y="-37.9473"
                width="19.25"
                height="178.135"
                transform="rotate(30 260.61 -37.9473)"
                fill="#CFCBD7"
            />
            <rect
                x="300.349"
                y="-37.9473"
                width="19.25"
                height="178.135"
                transform="rotate(30 300.349 -37.9473)"
                fill="#CFCBD7"
            />
        </g>
        <defs>
            <clipPath id="clip0_531_354">
                <rect width="250" height="88" fill="white" />
            </clipPath>
        </defs>
    </svg>
);

const ArrowLeftIcon = ({ width, height }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ width, height }}
    >
        <path
            d="M18.4875 2.17963C19.2767 2.63929 19.4031 3.71318 19.6482 5.83961C20.1173 9.9091 20.1173 14.0909 19.6482 18.1604C19.4031 20.2868 19.2767 21.3607 18.4875 21.8204C17.6983 22.28 16.5851 21.8177 14.6876 20.8867C11.2228 19.1868 7.8967 17.1754 4.74462 14.9333C2.94161 13.6508 1.99374 12.9444 2.00003 11.9897C1.99374 11.0349 2.94161 10.3492 4.74462 9.06667C7.8967 6.82459 11.2228 4.81323 14.6876 3.1133C16.5851 2.18234 17.6983 1.71996 18.4875 2.17963Z"
            fill="#FB7001"
        />
    </svg>
);

const ArrowRightIcon = ({ width, height }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        style={{ width, height }}
    >
        <path
            d="M5.51248 21.8204C4.72329 21.3607 4.59689 20.2868 4.35179 18.1604C3.88272 14.0909 3.88275 9.90911 4.35182 5.83961C4.59692 3.71318 4.72332 2.63929 5.51251 2.17963C6.3017 1.71996 7.41491 2.18234 9.31239 3.1133C12.7772 4.81323 16.1033 6.82459 19.2554 9.06667C21.0584 10.3492 22.0063 11.0556 22 12.0103C22.0063 12.9651 21.0584 13.6508 19.2554 14.9333C16.1033 17.1754 12.7772 19.1868 9.31242 20.8867C7.41494 21.8177 6.30166 22.28 5.51248 21.8204Z"
            fill="#FB7001"
        />
    </svg>
);

const StyledViewportFrame = styled.div`
    svg {
        position: relative;
        width: 100%;
        height: 100%;
        stroke-width: 3px;
        stroke: #24202b;
    }
`;
const ViewportFrame = () => {
    return (
        <StyledViewportFrame>
            <svg xmlns="http://www.w3.org/2000/svg" width="0" height="0" viewBox="0 0 854 649" fill="none">
                <g filter="url(#filter0_diii_531_538)">
                    <path
                        d="M0 24C0 10.7452 10.7452 0 24 0H830C843.255 0 854 10.7452 854 24V623C854 636.255 843.255 647 830 647H24C10.7452 647 0 636.255 0 623V24Z"
                        fill="#3F5EA3"
                        fill-opacity="0.01"
                    />
                    <path
                        d="M0 24C0 10.7452 10.7452 0 24 0H830C843.255 0 854 10.7452 854 24V623C854 636.255 843.255 647 830 647H24C10.7452 647 0 636.255 0 623V24Z"
                        fill="url(#paint0_linear_531_538)"
                        fill-opacity="0.3"
                    />
                    <path
                        d="M1.5 24C1.5 11.5736 11.5736 1.5 24 1.5H830C842.426 1.5 852.5 11.5736 852.5 24V623C852.5 635.426 842.426 645.5 830 645.5H24C11.5736 645.5 1.5 635.426 1.5 623V24Z"
                        stroke="#24202B"
                        stroke-width="3"
                    />
                </g>
                <defs>
                    <filter
                        id="filter0_diii_531_538"
                        x="0"
                        y="-4"
                        width="854"
                        height="655"
                        filterUnits="userSpaceOnUse"
                        color-interpolation-filters="sRGB"
                    >
                        <feFlood flood-opacity="0" result="BackgroundImageFix" />
                        <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                        />
                        <feOffset dy="2" />
                        <feComposite in2="hardAlpha" operator="out" />
                        <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0" />
                        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_531_538" />
                        <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_531_538" result="shape" />
                        <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                        />
                        <feOffset dy="4" />
                        <feGaussianBlur stdDeviation="40" />
                        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.64 0" />
                        <feBlend mode="normal" in2="shape" result="effect2_innerShadow_531_538" />
                        <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                        />
                        <feOffset dy="6" />
                        <feGaussianBlur stdDeviation="2" />
                        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                        <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
                        <feBlend mode="normal" in2="effect2_innerShadow_531_538" result="effect3_innerShadow_531_538" />
                        <feColorMatrix
                            in="SourceAlpha"
                            type="matrix"
                            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
                            result="hardAlpha"
                        />
                        <feOffset dy="-6" />
                        <feGaussianBlur stdDeviation="2" />
                        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1" />
                        <feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0" />
                        <feBlend mode="normal" in2="effect3_innerShadow_531_538" result="effect4_innerShadow_531_538" />
                    </filter>
                    <linearGradient
                        id="paint0_linear_531_538"
                        x1="347.57"
                        y1="0"
                        x2="347.57"
                        y2="647"
                        gradientUnits="userSpaceOnUse"
                    >
                        <stop offset="0.0718424" stop-color="#08003C" />
                        <stop offset="0.780997" stop-opacity="0" />
                    </linearGradient>
                </defs>
            </svg>
        </StyledViewportFrame>
    );
};

const BASIC_FACTORY_SOL = `// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

contract BasicFactory is BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes memory /*payload*/ ) public {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.CRAFT, (buildingInstance)));
    }
}
`;

const BASIC_FACTORY_BYTECODE = `608060405234801561001057600080fd5b5061097d806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c806367cace0714610030575b600080fd5b61004a600480360381019061004591906103bb565b61004c565b005b8373ffffffffffffffffffffffffffffffffffffffff1663ebb3d5896040518163ffffffff1660e01b81526004016020604051808303816000875af1158015610099573d6000803e3d6000fd5b505050506040513d601f19601f820116820180604052508101906100bd919061047c565b73ffffffffffffffffffffffffffffffffffffffff1663ab7fff18846040516024016100e991906104b8565b604051602081830303815290604052638cb22ef860e01b6020820180517bffffffffffffffffffffffffffffffffffffffffffffffffffffffff83818316178352505050506040518263ffffffff1660e01b815260040161014a9190610552565b6000604051808303816000875af1158015610169573d6000803e3d6000fd5b505050506040513d6000823e3d601f19601f8201168201806040525081019061019291906108fe565b5050505050565b6000604051905090565b600080fd5b600080fd5b600073ffffffffffffffffffffffffffffffffffffffff82169050919050565b60006101d8826101ad565b9050919050565b60006101ea826101cd565b9050919050565b6101fa816101df565b811461020557600080fd5b50565b600081359050610217816101f1565b92915050565b60007fffffffffffffffffffffffffffffffffffffffffffffffff000000000000000082169050919050565b6102528161021d565b811461025d57600080fd5b50565b60008135905061026f81610249565b92915050565b600080fd5b600080fd5b6000601f19601f8301169050919050565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6102c88261027f565b810181811067ffffffffffffffff821117156102e7576102e6610290565b5b80604052505050565b60006102fa610199565b905061030682826102bf565b919050565b600067ffffffffffffffff82111561032657610325610290565b5b61032f8261027f565b9050602081019050919050565b82818337600083830152505050565b600061035e6103598461030b565b6102f0565b90508281526020810184848401111561037a5761037961027a565b5b61038584828561033c565b509392505050565b600082601f8301126103a2576103a1610275565b5b81356103b284826020860161034b565b91505092915050565b600080600080608085870312156103d5576103d46101a3565b5b60006103e387828801610208565b94505060206103f487828801610260565b935050604061040587828801610260565b925050606085013567ffffffffffffffff811115610426576104256101a8565b5b6104328782880161038d565b91505092959194509250565b6000610449826101cd565b9050919050565b6104598161043e565b811461046457600080fd5b50565b60008151905061047681610450565b92915050565b600060208284031215610492576104916101a3565b5b60006104a084828501610467565b91505092915050565b6104b28161021d565b82525050565b60006020820190506104cd60008301846104a9565b92915050565b600081519050919050565b600082825260208201905092915050565b60005b8381101561050d5780820151818401526020810190506104f2565b60008484015250505050565b6000610524826104d3565b61052e81856104de565b935061053e8185602086016104ef565b6105478161027f565b840191505092915050565b6000602082019050818103600083015261056c8184610519565b905092915050565b600067ffffffffffffffff82111561058f5761058e610290565b5b602082029050602081019050919050565b600080fd5b600080fd5b600080fd5b600381106105bc57600080fd5b50565b6000815190506105ce816105af565b92915050565b60007fffffffff0000000000000000000000000000000000000000000000000000000082169050919050565b610609816105d4565b811461061457600080fd5b50565b60008151905061062681610600565b92915050565b600060ff82169050919050565b6106428161062c565b811461064d57600080fd5b50565b60008151905061065f81610639565b92915050565b60008151905061067481610249565b92915050565b610683816101ad565b811461068e57600080fd5b50565b6000815190506106a08161067a565b92915050565b600067ffffffffffffffff8211156106c1576106c0610290565b5b6106ca8261027f565b9050602081019050919050565b60006106ea6106e5846106a6565b6102f0565b9050828152602081018484840111156107065761070561027a565b5b6107118482856104ef565b509392505050565b600082601f83011261072e5761072d610275565b5b815161073e8482602086016106d7565b91505092915050565b6000610100828403121561075e5761075d6105a5565b5b6107696101006102f0565b90506000610779848285016105bf565b600083015250602061078d84828501610617565b60208301525060406107a184828501610650565b60408301525060606107b584828501610665565b60608301525060806107c984828501610665565b60808301525060a06107dd84828501610691565b60a08301525060c082015167ffffffffffffffff811115610801576108006105aa565b5b61080d84828501610719565b60c08301525060e082015167ffffffffffffffff811115610831576108306105aa565b5b61083d84828501610719565b60e08301525092915050565b600061085c61085784610574565b6102f0565b9050808382526020820190506020840283018581111561087f5761087e6105a0565b5b835b818110156108c657805167ffffffffffffffff8111156108a4576108a3610275565b5b8086016108b18982610747565b85526020850194505050602081019050610881565b5050509392505050565b600082601f8301126108e5576108e4610275565b5b81516108f5848260208601610849565b91505092915050565b600060208284031215610914576109136101a3565b5b600082015167ffffffffffffffff811115610932576109316101a8565b5b61093e848285016108d0565b9150509291505056fea264697066735822122063e18c9190b6d83908ebc6b9c3941756eb3c71339c05ba83f7a1489ce968553864736f6c63430008130033`;
const BASIC_FACTORY_JS = `import ds from "downstream";

export default function update({ selected, world }) {
    const { tiles, mobileUnit: selectedUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = (world?.buildings || []).find(
        (b) => selectedTile && b.location?.tile.id === selectedTile.id,
    );
    const selectedBuildingBags = selectedBuilding
        ? (world?.bags || []).filter(
              (bag) => bag.equipee?.node.id === selectedBuilding.id,
          )
        : [];
    const inputBag =
        selectedBuilding &&
        selectedBuildingBags.find((bag) => bag.equipee.key === 0);
    const inputSlots = inputBag && inputBag.slots.sort((a, b) => a.key - b.key);
    const requiredInputs = selectedBuilding?.kind?.inputs || [];

    const canCraft =
        selectedUnit &&
        inputSlots &&
        inputSlots.length >= requiredInputs.length &&
        requiredInputs.every(
            (requiredSlot) =>
                inputSlots[requiredSlot.key].item.id == requiredSlot.item.id &&
                inputSlots[requiredSlot.key].balance == requiredSlot.balance,
        );

    const craft = () => {
        if (!selectedUnit) {
            ds.log("no selected engineer");
            return;
        }
        if (!selectedBuilding) {
            ds.log("no selected building");
            return;
        }

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, selectedUnit.id, []],
        });
    };

    return {
        version: 1,
        components: [
            {
                type: "building",
                id: "green-goo-fusion",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        buttons: [
                            {
                                text: "Craft",
                                type: "action",
                                action: craft,
                                disabled: !canCraft,
                            },
                        ],
                    },
                ],
            },
        ],
    };
}
`;

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
            <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
                {children.map((child) => {
                    const isActive = child.props.name === active;
                    return (
                        <div
                            style={{
                                textShadow: '0px 2px 0px rgba(255, 255, 255, 0.30)',
                                margin: '0 1rem 0 -0.75rem',
                                borderColor: isActive ? '#333' : '#aaa',
                                borderWidth: '2px 2px 0 2px',
                                borderStyle: 'solid',
                                borderRadius: '1rem 1rem 0rem 0',
                                padding: '1rem 2rem',
                                fontWeight: isActive ? 'bold' : 'normal',
                                cursor: 'pointer',
                                color: '#333',
                                backgroundColor: isActive ? '#FB7001' : '#E4E1EB',
                                boxShadow: isActive
                                    ? '0px 3px 0px 0px rgba(255, 255, 255, 0.30) inset, 0px -3px 0px 0px rgba(0, 0, 0, 0.08) inset'
                                    : '0px 1px 0px 0px #FFF inset, 0px -1px 0px 0px rgba(0, 0, 0, 0.08) inset',
                                filter: 'drop-shadow(0px 2px 0px #FFF)',
                            }}
                            key={child.props.name}
                            className="tab"
                            onClick={() => setActive(child.props.name)}
                        >
                            {child.props.name}
                        </div>
                    );
                })}
            </div>
            <div>
                {children.map((child) => (
                    <div
                        key={child.props.name}
                        style={{
                            position: 'relative',
                            zIndex: '10',
                            display: child.props.name === active ? 'block' : 'none',
                            border: '2px solid #333',
                            borderRadius: '1rem 0 1rem 1rem',
                            background: '#fff',
                            padding: '1rem',
                            margin: '0 1rem',
                            height: '39rem',
                        }}
                        className="content"
                    >
                        {child}
                    </div>
                ))}
            </div>
        </div>
    );
};

const NumberInput = ({
    value,
    min,
    max,
    onChange,
    style,
}: {
    value: number;
    min: number;
    max: number;
    onChange: (v: number) => void;
    style?: any;
}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', margin: '0 1rem', ...(style || {}) }}>
            <button
                style={{
                    margin: 0,
                    opacity: value === min ? 0.5 : 1,
                    borderRadius: '0.5rem 0 0 0.5rem',
                }}
                onClick={() => (value === min ? undefined : onChange(value - 1))}
            >
                <ArrowLeftIcon width="1rem" height="1rem" />
            </button>
            <div
                style={{
                    width: '3rem',
                    color: '#FB7001',
                    fontWeight: 800,
                    fontSize: '1.125rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textShadow: '0px 0px 33px rgba(251, 112, 1, 0.24), 0px 0px 4px rgba(251, 112, 1, 0.64)',
                    background:
                        'radial-gradient(74.8% 74.8% at 50% 50%, rgba(255, 255, 255, 0.32) 22.4%, rgba(255, 255, 255, 0.00) 78.65%), #24202B',
                    backgroundBlendMode: 'overlay, normal',
                }}
            >
                {value}
            </div>
            <button
                style={{
                    margin: 0,
                    opacity: value === max ? 0.5 : 1,
                    borderRadius: '0 0.5rem 0.5rem 0',
                }}
                onClick={() => (value === max ? undefined : onChange(value + 1))}
            >
                <ArrowRightIcon width="1rem" height="1rem" />
            </button>
        </div>
    );
};

const ConstructMaterial = ({
    name,
    quantity,
    onChangeQuantity,
}: {
    name: string;
    quantity: number;
    onChangeQuantity: (v: number) => void;
}) => {
    const label = name.slice(0, 1).toUpperCase();
    const color = label === 'R' ? '#FF274E' : label === 'G' ? '#21E63F' : '#00C2FF';
    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'space-between',
                margin: '1rem 0',
                height: '2.5rem',
            }}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '3.5rem',
                    height: '2.5rem',
                    borderRadius: '0.5rem',
                    background: '#E4E1EB',
                    boxShadow: '0px 2px 0px 0px #FFF, 0px 2px 0px 0px rgba(0, 0, 0, 0.06) inset',
                }}
            >
                <span>{name.slice(0, 1)}</span>
            </div>
            <div
                style={{
                    position: 'relative',
                    width: '100%',
                    borderRadius: '0.5rem',
                    background: '#E4E1EB',
                    boxShadow: '0px 2px 0px 0px #FFF, 0px 2px 0px 0px rgba(0, 0, 0, 0.06) inset',
                    margin: '0 0.5rem',
                    border: '2px solid #24202b',
                    overflow: 'hidden',
                }}
            >
                <div
                    style={{
                        borderRadius: '0.5rem',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: `${quantity}%`,
                        backgroundColor: color,
                        boxShadow: '0px 1px 0px 1px rgba(0,0,0,0.3)',
                    }}
                ></div>
            </div>
            <NumberInput min={10} max={100} value={quantity} onChange={onChangeQuantity} style={{ margin: 0 }} />
        </div>
    );
};

const ItemSelector = ({
    name,
    onChange,
    items,
    enabledIf,
}: {
    name: string;
    items: ItemFragment[];
    onChange: (name: string) => void;
    enabledIf: (item: ItemFragment) => boolean;
}) => {
    const selectedItem = items.find((item) => item.name?.value === name);
    const _onChangeItemName = useCallback((e) => onChange(e.target.value), [onChange]);
    return (
        <select
            style={{ display: 'block' }}
            onChange={_onChangeItemName}
            value={selectedItem?.name?.value || '__none__'}
        >
            <option value="__none__">None</option>
            {items.map((item) => {
                const enabled = enabledIf(item);
                return (
                    <option key={item.id} value={item.name?.value || '__none__'} disabled={!enabled}>
                        {item.name?.value || ''}
                        {enabled ? '' : ' (not enough input goo)'}
                    </option>
                );
            })}
        </select>
    );
};

const GooBadge = ({ color, value }) => {
    return (
        <div
            style={{
                minWidth: '3.5rem',
                padding: '1.2rem 1rem 0 1.2rem',
                minHeight: '3.5rem',
                marginLeft: '0.2rem',
                borderRadius: '0rem 0rem 0.5rem 0.5rem',
                background: '#E4E1EB',
                boxShadow: `0px 2px 0px 0px #FFF, 0px 8px 0px 0px ${color} inset`,
                textShadow: '0px 1px 0px #FFF',
                fontSize: '1rem',
                fontWeight: 800,
                color: '#0D090F',
            }}
        >
            {value < 10 ? `0${value}` : `${value}`}
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
    const selectedItem = items.find((item) => item.name?.value === name);
    const [_stackable, greenGoo, blueGoo, redGoo] = selectedItem ? getItemStructure(selectedItem.id) : [false, 0, 0, 0];
    const qty = selectedItem ? quantity : 0;

    return (
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', margin: '1rem', flex: '0 0 0' }}>
            <ItemSelector name={name} items={items} onChange={onChangeItemName} enabledIf={() => true} />
            <NumberInput min={0} max={100} value={qty} onChange={onChangeQuantity} />
            <GooBadge color="red" value={redGoo * qty} />
            <GooBadge color="green" value={greenGoo * qty} />
            <GooBadge color="blue" value={blueGoo * qty} />
        </div>
    );
};

const FACTORY_TOPS = Array.from({ length: 17 }, (_, i) => i + 1).map((n) => (n < 10 ? `0${n}` : `${n}`));
const FACTORY_BOTTOMS = Array.from({ length: 14 }, (_, i) => i + 1).map((n) => (n < 10 ? `0${n}` : `${n}`));
const PALLETE = ['blue', 'pink', 'yellow', 'green', 'red', 'purple'];
const ITEM_ICONS = [
    'xx-01',
    '31-19',
    '32-69',
    '32-23',
    '31-92',
    '31-5',
    '31-270',
    '18-161',
    '31-16',
    '30-82',
    '11-248',
    '21-206',
    '17-111',
    '30-182',
    '19-35',
    '30-115',
    '18-82',
    '28-111',
    '28-101',
    '26-66',
    '19-178',
    '26-189',
    '17-72',
    '24-209',
    '24-129',
    '22-204',
    '22-170',
    '22-136',
    '22-115',
    '14-183',
    '09-213',
];

const StyledBuildingFabricator = styled.div`
    height: 100%;
    position: relative;
    z-index: 99;
    margin-top: 3rem;

    button {
        padding: 1rem;
        background: linear-gradient(180deg, #e4e1eb 0%, rgba(228, 225, 235, 0) 65.62%), #f7f5fa;
        border-radius: 0.375rem;
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1 0 0;
        align-self: stretch;
        border: 2px solid #24202b;
    }
    button.active {
        background: linear-gradient(0deg, #fb7001 0%, #fb7001 100%), #f7f5fa;
    }

    input[type='text'],
    select {
        width: 100%;
        border-radius: 0.5rem;
        border: 2px solid #a8a2b5;
        background: #edebf3;
        box-shadow: 0px 2px 0px 0px #fff, 0px -2px 0px 0px rgba(168, 162, 181, 0.24);
        padding: 0.5rem;
    }

    fieldset {
        border-color: transparent;
        margin-bottom: 1rem;
    }

    legend {
        text-transform: uppercase;
        font-size: 80%;
    }
`;

const BuildingFabricator = () => {
    const { ready: mapReady, containerStyle, setContainerStyle } = useUnityMap();
    const [buildingSpec, setBuildingSpec] = useState<z.infer<typeof BuildingKindFactorySpec>>({
        category: 'factory',
        name: '',
        description: '',
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
            { name: 'Red Goo', quantity: 25 },
            { name: 'Green Goo', quantity: 25 },
            { name: 'Blue Goo', quantity: 25 },
            { name: '', quantity: 0 },
        ],
        outputs: [{ name: '', quantity: 1 }],
    });
    const [outputExisting, setOutputExisting] = useState<boolean>(false);
    const [outputStackable, setOutputStackable] = useState<boolean>(false);
    const [outputIcon, setOutputIcon] = useState<number>(0);
    const world = useWorld();
    const player = usePlayer();
    const buildingKinds = useBuildingKinds();
    const availableItems = world?.items || [];
    const coords = useMemo(() => ({ q: 0, r: 0, s: 0 }), []);
    const model = buildingSpec.model;
    const [errors, setErrors] = useState<string[]>([]);
    const [status, setStatus] = useState<string>('');

    // TODO: if output item already exists, then outputGoo is already known and we must validate the inputs are enough
    const outputGoo = (buildingSpec.inputs || [])
        .reduce(
            ([r, g, b], input) => {
                const item = availableItems.find((item) => item.name?.value === input.name);
                if (!item) {
                    return [r, g, b];
                }
                const [_stackable, greenGoo, blueGoo, redGoo] =
                    item?.id && input.quantity > 0 ? getItemStructure(item.id) : [false, 0, 0, 0];

                r += redGoo * input.quantity;
                g += greenGoo * input.quantity;
                b += blueGoo * input.quantity;
                return [r, g, b];
            },
            [0, 0, 0]
        )
        .map((v) => Math.floor(v / 2.0));

    const onChangeBuildingName = useCallback((e) => {
        const name = (e.target.value || '').slice(0, 35);
        if (!/^[a-zA-Z0-9]*$/.test(name)) {
            return;
        }
        setBuildingSpec((buildingSpec) => {
            buildingSpec.name = name;
            return { ...buildingSpec };
        });
    }, []);
    const onChangeBuildingDescription = useCallback(
        (e) =>
            setBuildingSpec((buildingSpec) => {
                buildingSpec.description = e.target.value;
                return { ...buildingSpec };
            }),
        []
    );
    const onChangeBuildingColor = useCallback(
        (c: number) =>
            setBuildingSpec((buildingSpec) => {
                buildingSpec.color = c;
                return { ...buildingSpec };
            }),
        []
    );
    const onChangeOutputName = useCallback((name: string) => {
        if (!/^[a-zA-Z0-9]*$/.test(name)) {
            return;
        }
        name = name.slice(0, 35);
        setBuildingSpec((buildingSpec) => {
            buildingSpec.outputs = [{ name, quantity: 1 }];
            return { ...buildingSpec };
        });
    }, []);
    const onChangeOutputType = useCallback(
        (value: string) => {
            switch (value) {
                case 'customStackable':
                    onChangeOutputName('');
                    setOutputStackable(true);
                    setOutputExisting(false);
                    break;
                case 'customNonStackable':
                    onChangeOutputName('');
                    setOutputStackable(false);
                    setOutputExisting(false);
                    break;
                case 'existing':
                    onChangeOutputName('');
                    setOutputExisting(true);
                    break;
            }
        },
        [onChangeOutputName]
    );
    const onChangeConstructQuantity = useCallback(
        (idx: number, value: number) =>
            setBuildingSpec((buildingSpec) => {
                buildingSpec.materials[idx].quantity = value;
                return { ...buildingSpec };
            }),
        []
    );
    const onChangeInputQuantity = useCallback(
        (idx: number, n: number) =>
            setBuildingSpec((buildingSpec) => {
                if (!buildingSpec.inputs) {
                    buildingSpec.inputs = [];
                }
                buildingSpec.inputs[idx].quantity = n;
                return { ...buildingSpec };
            }),
        []
    );
    const onChangeInputName = useCallback(
        (idx: number, name: string) =>
            setBuildingSpec((buildingSpec) => {
                if (!buildingSpec.inputs) {
                    buildingSpec.inputs = [];
                }
                buildingSpec.inputs[idx].name = name;
                return { ...buildingSpec };
            }),
        []
    );
    const nextTop = useCallback(() => {
        const [modelBottom, modelTop] = model.split('-');
        const idx = FACTORY_TOPS.findIndex((part) => part === modelTop) || 0;
        const newTop = FACTORY_TOPS[idx + 1 === FACTORY_TOPS.length ? 0 : idx + 1];
        setBuildingSpec((buildingSpec) => {
            buildingSpec.model = `${modelBottom}-${newTop}`;
            return { ...buildingSpec };
        });
    }, [model]);
    const prevTop = useCallback(() => {
        const [modelBottom, modelTop] = model.split('-');
        const idx = FACTORY_TOPS.findIndex((part) => part === modelTop) || 0;
        const newTop = FACTORY_TOPS[idx === 0 ? FACTORY_TOPS.length - 1 : idx - 1];
        setBuildingSpec((buildingSpec) => {
            buildingSpec.model = `${modelBottom}-${newTop}`;
            return { ...buildingSpec };
        });
    }, [model]);
    const nextBottom = useCallback(() => {
        const [modelBottom, modelTop] = model.split('-');
        const idx = FACTORY_BOTTOMS.findIndex((part) => part === modelBottom) || 0;
        const newBottom = FACTORY_BOTTOMS[idx + 1 === FACTORY_BOTTOMS.length ? 0 : idx + 1];
        setBuildingSpec((buildingSpec) => {
            buildingSpec.model = `${newBottom}-${modelTop}`;
            return { ...buildingSpec };
        });
    }, [model]);
    const prevBottom = useCallback(() => {
        const [modelBottom, modelTop] = model.split('-');
        const idx = FACTORY_BOTTOMS.findIndex((part) => part === modelBottom) || 0;
        const newBottom = FACTORY_BOTTOMS[idx === 0 ? FACTORY_BOTTOMS.length - 1 : idx - 1];
        setBuildingSpec((buildingSpec) => {
            buildingSpec.model = `${newBottom}-${modelTop}`;
            return { ...buildingSpec };
        });
    }, [model]);

    const nextIcon = useCallback(() => {
        setOutputIcon(outputIcon + 1 === ITEM_ICONS.length ? 0 : outputIcon + 1);
    }, [outputIcon]);

    const prevIcon = useCallback(() => {
        setOutputIcon(outputIcon - 1 === -1 ? ITEM_ICONS.length - 1 : outputIcon - 1);
    }, [outputIcon]);

    const randomizeModel = useCallback(() => {
        const randomTop = FACTORY_TOPS[Math.floor(Math.random() * FACTORY_TOPS.length)];
        const randomBottom = FACTORY_TOPS[Math.floor(Math.random() * FACTORY_TOPS.length)];
        const randomColor = Math.floor(Math.random() * PALLETE.length);
        const model = `${randomBottom}-${randomTop}`;
        setBuildingSpec((buildingSpec) => {
            buildingSpec.model = model;
            buildingSpec.color = randomColor;
            return { ...buildingSpec };
        });
    }, []);

    useEffect(() => {
        randomizeModel();
    }, [randomizeModel]);

    const validationErrors = useMemo(() => {
        return [];
    }, []);
    if (validationErrors.length > 0) {
        console.warn('invalid', validationErrors);
    }

    const getManifestsYAML = useCallback(
        (overrides = {}): string => {
            const exportable: z.infer<typeof Manifest>[] = [
                {
                    kind: 'BuildingKind',
                    spec: {
                        ...buildingSpec,
                        ...overrides,
                        inputs: (buildingSpec.inputs || []).filter(
                            (inp) => inp.quantity > 0 && inp.name != '' && inp.name != '__none__'
                        ),
                    },
                },
            ];
            if (!outputExisting) {
                exportable.push({
                    kind: 'Item',
                    spec: {
                        name: (buildingSpec.outputs || [])[0]?.name || '',
                        icon: ITEM_ICONS[outputIcon],
                        goo: {
                            red: outputGoo[0],
                            green: outputGoo[1],
                            blue: outputGoo[2],
                        },
                        stackable: outputStackable,
                    },
                });
            }
            return `${exportable.length > 0 ? '\n---\n' : ''}${exportable.map(toYAML).join('\n---\n')}`;
        },
        [buildingSpec, outputGoo, outputStackable, outputIcon, outputExisting]
    );

    const exportFiles = async () => {
        try {
            const name = 'basic-factory';
            const zip = new JSZip();
            const folder = zip.folder(name);
            if (!folder) {
                console.error('unable to create zip folder');
                return;
            }
            folder.file(`${name}.yaml`, getManifestsYAML());
            folder.file(`${name}.js`, BASIC_FACTORY_JS);
            folder.file(`${name}.sol`, BASIC_FACTORY_SOL);
            const blob = await zip.generateAsync({ type: 'blob' });
            saveAs(blob, `${name}.zip`);
        } catch (err) {
            console.error(`export of ${name}.zip failed:`, err);
        }
    };

    const applyFiles = useCallback(async () => {
        setErrors([]);
        setStatus('');
        if (!player) {
            console.error('cannot apply: no player connected');
            return;
        }
        if (!world) {
            console.error('cannot apply: no world data loaded');
            return;
        }
        if (!buildingKinds) {
            console.error('cannot apply: no building kinds data loaded');
            return;
        }
        try {
            const yaml = getManifestsYAML({
                contract: { bytecode: BASIC_FACTORY_BYTECODE }, // FIXME: hack until we can compile in browser
                plugin: { inline: BASIC_FACTORY_JS },
            });
            console.log('parseManifests', yaml);
            const docs = parseManifestDocuments(yaml, 'basic-factory.yaml');
            console.log('getOpsForManifests..');
            const compiler: any = () => {}; // FIXME: hack until we can compile in browser
            const opsets = await getOpsForManifests(docs, world, buildingKinds, compiler);
            const actions = opsets.flatMap((opset) => opset.flatMap((op) => op.actions));
            console.log('applying', actions);
            await player.dispatchAndWait(...actions);
            console.info('APPLIED');
            setStatus('Deployed!');
        } catch (err) {
            const messages = `${err}`.replace(/Error:/i, '').split('invalid manifest basic-factory.yaml:');
            console.error(`cannot apply: ${messages.join(' AND ')}`);
            setErrors(messages);
            return;
        }
    }, [world, buildingKinds, getManifestsYAML, player]);

    const onChangeMaterialPreset = useCallback(
        (preset: number) => {
            switch (preset) {
                case 0:
                    onChangeConstructQuantity(0, 10);
                    onChangeConstructQuantity(1, 10);
                    onChangeConstructQuantity(2, 10);
                    break;
                case 1:
                    onChangeConstructQuantity(0, 50);
                    onChangeConstructQuantity(1, 50);
                    onChangeConstructQuantity(2, 50);
                    break;
                case 2:
                    onChangeConstructQuantity(0, 100);
                    onChangeConstructQuantity(1, 100);
                    onChangeConstructQuantity(2, 100);
                    break;
                default:
            }
        },
        [onChangeConstructQuantity]
    );

    const [wantedContainerStyle, setWantedContainerStyle] = useState<any>({
        position: 'absolute',
        display: 'none',
    });

    useEffect(() => {
        if (containerStyle === wantedContainerStyle) {
            return;
        }
        if (!setContainerStyle) {
            return;
        }
        setContainerStyle(wantedContainerStyle);
    }, [containerStyle, wantedContainerStyle, setContainerStyle]);

    const previewContainer = useRef<HTMLDivElement>(null);
    const onPreviewResize = useCallback(() => {
        const rect = previewContainer.current ? previewContainer.current.getBoundingClientRect() : undefined;
        if (!rect) {
            return;
        }
        setWantedContainerStyle({
            position: 'absolute',
            display: 'block',
            top: `${rect.top}px`,
            right: `${rect.right}px`,
            bottom: `${rect.bottom}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            pointerEvents: 'none',
            clipPath: 'inset(0% 0% 0% 0% round 1rem)',
        });
    }, []);
    useResizeObserver({ element: previewContainer, callback: onPreviewResize });

    const outputItemName = (buildingSpec.outputs || []).find(() => true)?.name || '';

    const hasEnoughAvailableGoo = (item) => {
        if (!item) {
            return false;
        }
        const [availableRed, availableGreen, availableBlue] = outputGoo;
        const [_stackable, greenGoo, blueGoo, redGoo] = getItemStructure(item.id);
        return availableGreen >= greenGoo && availableBlue >= blueGoo && availableRed >= redGoo;
    };

    const outputItemId = outputExisting
        ? availableItems.find((item) => item.name?.value === outputItemName)?.id
        : encodeItemID({
              name: outputItemName || '',
              stackable: !!outputStackable,
              goo: {
                  red: outputGoo[0] || 0,
                  green: outputGoo[1] || 0,
                  blue: outputGoo[2] || 0,
              },
          });
    const [_finalStackable, finalOutputGreen, finalOutputBlue, finalOutputRed] = outputItemId
        ? getItemStructure(outputItemId)
        : [false, 0, 0, 0];
    const finalOutputIcon = iconURL(
        outputExisting ? availableItems.find((item) => item.id === outputItemId)?.icon?.value : ITEM_ICONS[outputIcon]
    );

    const preset = ((): string => {
        if (buildingSpec.materials.every((m) => m.quantity === 10)) {
            return 'weak';
        } else if (buildingSpec.materials.every((m) => m.quantity === 50)) {
            return 'medium';
        } else if (buildingSpec.materials.every((m) => m.quantity === 100)) {
            return 'strong';
        } else {
            return 'custom';
        }
    })();

    return (
        <StyledBuildingFabricator>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    justifyContent: 'space-between',
                    width: '100rem',
                    margin: '0 auto',
                }}
            >
                <div
                    style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', flexWrap: 'nowrap', width: '50%' }}
                >
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            width: '100%',
                        }}
                    >
                        <div style={{ paddingLeft: '1rem', display: 'flex', flexDirection: 'column' }}>
                            <div>
                                <span
                                    style={{
                                        borderRadius: '0.375rem',
                                        background: '#FB7001',
                                        padding: '0.5rem',
                                        color: '#fff',
                                        fontWeight: 800,
                                    }}
                                >
                                    HEXWOOD
                                </span>
                            </div>
                            <div>
                                <span
                                    style={{
                                        color: '#0D090F',
                                        textShadow: '0px 2.237093687057495px 0px #FFF',
                                        fontSize: '2.6rem',
                                        fontWeight: 800,
                                        letterSpacing: '0.01rem',
                                        textTransform: 'uppercase',
                                    }}
                                >
                                    Building Configurator
                                </span>
                            </div>
                        </div>
                        <div style={{ height: '5rem', width: '150px', overflow: 'hidden', marginRight: '1rem' }}>
                            <StripeySpacer height="100%" />
                        </div>
                    </div>
                    <GroupedContent initial="Details">
                        <Content name="Details">
                            <fieldset>
                                <legend>Building Name</legend>
                                <input type="text" value={buildingSpec.name} onChange={onChangeBuildingName} />
                            </fieldset>
                            <fieldset>
                                <legend>Building Description</legend>
                                <input
                                    type="text"
                                    value={buildingSpec.description}
                                    onChange={onChangeBuildingDescription}
                                />
                            </fieldset>
                            <fieldset>
                                <legend>Construction Materials</legend>
                                <div
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'row',
                                        height: '2.5rem',
                                        background: '#24202b',
                                        borderRadius: '0.375rem',
                                        fontSize: '1.2rem',
                                        fontWeight: 800,
                                    }}
                                >
                                    <button
                                        onClick={() => onChangeMaterialPreset(0)}
                                        className={preset === 'weak' ? 'active' : ''}
                                    >
                                        Weak
                                    </button>
                                    <button
                                        onClick={() => onChangeMaterialPreset(1)}
                                        className={preset === 'medium' ? 'active' : ''}
                                    >
                                        Medium
                                    </button>
                                    <button
                                        onClick={() => onChangeMaterialPreset(2)}
                                        className={preset === 'strong' ? 'active' : ''}
                                    >
                                        Strong
                                    </button>
                                    <button onClick={() => {}} className={preset === 'custom' ? 'active' : ''}>
                                        Custom
                                    </button>
                                </div>
                                {buildingSpec.materials.map((material, idx) => (
                                    <ConstructMaterial
                                        key={idx}
                                        name={material.name}
                                        quantity={material.quantity}
                                        onChangeQuantity={(value) => onChangeConstructQuantity(idx, value)}
                                    />
                                ))}
                            </fieldset>
                        </Content>
                        <Content name="Inputs">
                            {(buildingSpec.inputs || []).map((input, idx) => (
                                <InputItem
                                    key={idx}
                                    name={input.name}
                                    quantity={input.quantity}
                                    onChangeItemName={(name: string) => onChangeInputName(idx, name)}
                                    onChangeQuantity={(n: number) => onChangeInputQuantity(idx, n)}
                                    items={availableItems}
                                />
                            ))}
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    flexWrap: 'nowrap',
                                    justifyContent: 'flex-end',
                                    margin: '1rem',
                                    flex: '0 0 0',
                                    marginTop: '1.5rem',
                                }}
                            >
                                <div style={{ fontWeight: 800, padding: '0.5rem' }}>
                                    Total goo available for output:
                                </div>
                                <div></div>
                                <GooBadge color="red" value={outputGoo[0]} />
                                <GooBadge color="green" value={outputGoo[1]} />
                                <GooBadge color="blue" value={outputGoo[2]} />
                            </div>
                        </Content>
                        <Content name="Output">
                            <fieldset>
                                <legend>Output type</legend>
                                <label style={{ display: 'block' }}>
                                    <input
                                        name="outputType"
                                        type="radio"
                                        value="customNonStackable"
                                        onChange={() => onChangeOutputType('customNonStackable')}
                                        checked={!outputExisting && !outputStackable}
                                    />
                                    Output a custom non-stackable item
                                </label>
                                <label style={{ display: 'block' }}>
                                    <input
                                        name="outputType"
                                        type="radio"
                                        value="customStackable"
                                        onChange={() => onChangeOutputType('customStackable')}
                                        checked={!outputExisting && outputStackable}
                                    />
                                    Output a custom stackable item
                                </label>
                                <label style={{ display: 'block' }}>
                                    <input
                                        name="outputType"
                                        type="radio"
                                        value="existing"
                                        onChange={() => onChangeOutputType('existing')}
                                        checked={outputExisting}
                                    />
                                    Output an existing item
                                </label>
                            </fieldset>
                            <div style={{ display: 'flex', flexDirection: 'row' }}>
                                <fieldset>
                                    <div
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'row',
                                        }}
                                    >
                                        <button
                                            style={{
                                                height: '4.8rem',
                                                margin: 0,
                                                opacity: outputExisting ? 0.5 : 1,
                                                borderRadius: '0.5rem 0 0 0.5rem',
                                            }}
                                            onClick={prevIcon}
                                        >
                                            <ArrowLeftIcon width="1rem" height="1rem" />
                                        </button>
                                        <BagItem
                                            name={outputItemName}
                                            icon={finalOutputIcon}
                                            quantity={1}
                                            itemId={outputItemId || ''}
                                            equipIndex={0}
                                            slotKey={0}
                                            ownerId="nope"
                                            isInteractable={false}
                                        />
                                        <button
                                            style={{
                                                height: '4.8rem',
                                                margin: 0,
                                                opacity: outputExisting ? 0.5 : 1,
                                                borderRadius: '0 0.5rem 0.5rem 0',
                                            }}
                                            onClick={nextIcon}
                                        >
                                            <ArrowRightIcon width="1rem" height="1rem" />
                                        </button>
                                    </div>
                                </fieldset>
                                <fieldset style={{ flexGrow: 1 }}>
                                    <legend style={{ margin: 0 }}>Item Name</legend>
                                    {outputExisting ? (
                                        <ItemSelector
                                            name={outputItemName}
                                            onChange={onChangeOutputName}
                                            items={world?.items || []}
                                            enabledIf={hasEnoughAvailableGoo}
                                        />
                                    ) : (
                                        <input
                                            type="text"
                                            value={outputItemName}
                                            onChange={(e) => onChangeOutputName(e.target.value)}
                                        />
                                    )}
                                </fieldset>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    flexWrap: 'nowrap',
                                    justifyContent: 'flex-end',
                                    margin: '1rem',
                                    flex: '0 0 0',
                                    marginTop: '1.5rem',
                                }}
                            >
                                <div style={{ fontWeight: 800, padding: '0.5rem' }}>Output item goo:</div>
                                <div></div>
                                <GooBadge color="red" value={finalOutputRed} />
                                <GooBadge color="green" value={finalOutputGreen} />
                                <GooBadge color="blue" value={finalOutputBlue} />
                            </div>
                        </Content>
                    </GroupedContent>
                </div>
                <div style={{ width: '50rem' }}>
                    {mapReady && (
                        <>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    flexWrap: 'nowrap',
                                    justifyContent: 'space-between',
                                    marginBottom: '1rem',
                                }}
                            >
                                <button onClick={prevTop} style={{}}>
                                    <ArrowLeftIcon width={24} height={24} />
                                </button>
                                <button onClick={nextTop} style={{}}>
                                    <ArrowRightIcon width={24} height={24} />
                                </button>
                            </div>
                            <div>
                                <GroundPlane height={0} />
                                <Tile id={'plinth'} height={0} color="#7288A6" {...coords} />
                                <FactoryBuilding
                                    id={`new-build`}
                                    height={0}
                                    model={`${buildingSpec.model}-${buildingSpec.color}`}
                                    rotation={-30}
                                    selected={'none'}
                                    {...coords}
                                />
                                <BuilderCamera {...coords} height={0.01} />
                            </div>
                            <div ref={previewContainer} style={{ height: '38rem', position: 'relative' }}>
                                <ViewportFrame />
                                <button
                                    onClick={randomizeModel}
                                    style={{
                                        opacity: 0.5,
                                        position: 'absolute',
                                        bottom: '1rem',
                                        left: '1rem',
                                        background: 'none',
                                        border: 0,
                                    }}
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        width="25"
                                        height="23"
                                        viewBox="0 0 25 23"
                                        fill="none"
                                    >
                                        <path
                                            d="M3.78665 0.971088C3.98525 0.442006 4.08455 0.177466 4.13406 0.135441C4.24321 0.0427899 4.34736 0.0425417 4.45696 0.134672C4.50667 0.17646 4.60674 0.439253 4.80689 0.964839C5.3187 2.30889 6.10803 3.22109 7.43621 3.85716C7.94264 4.09968 8.19585 4.22095 8.23267 4.27016C8.3182 4.38446 8.31626 4.46873 8.22559 4.57898C8.18654 4.62645 7.92008 4.73934 7.38714 4.96513C6.02685 5.54143 5.25571 6.63128 4.75926 8.54547C4.58489 9.21776 4.49771 9.5539 4.44677 9.60293C4.34017 9.70552 4.20958 9.70626 4.10183 9.60487C4.05034 9.55643 3.9593 9.22105 3.77724 8.55029C3.23983 6.57044 2.43238 5.51462 1.05749 4.9509C0.561055 4.74736 0.312837 4.64559 0.272981 4.59758C0.182637 4.48876 0.180996 4.39691 0.267395 4.28493C0.305511 4.23553 0.543733 4.12776 1.02018 3.91222C2.42876 3.27501 3.26871 2.35096 3.78665 0.971088ZM4.55168 18.5909C3.98926 18.3126 3.70805 18.1735 3.67238 18.1263C3.58535 18.0111 3.58499 17.943 3.6708 17.8268C3.70596 17.7792 3.98243 17.6388 4.53535 17.358C5.53918 16.8481 6.16668 16.0993 6.58056 15.0241C6.7854 14.4919 6.88782 14.2258 6.93711 14.1843C7.04699 14.0919 7.14737 14.0915 7.2579 14.1832C7.30748 14.2243 7.41133 14.4886 7.61902 15.0171C8.04289 16.0956 8.66262 16.8359 9.65329 17.3456C10.2031 17.6285 10.4781 17.7699 10.5129 17.8174C10.5983 17.9338 10.5978 18.0007 10.511 18.1159C10.4755 18.163 10.1943 18.3032 9.63179 18.5835C8.57543 19.1099 7.95784 19.9553 7.53458 21.2042C7.37732 21.6682 7.29868 21.9002 7.24838 21.9444C7.14227 22.0377 7.02346 22.0375 6.91758 21.944C6.8674 21.8997 6.78948 21.6679 6.63364 21.2043C6.20734 19.9361 5.60027 19.1096 4.55168 18.5909ZM10.2214 11.2229C9.29529 10.9272 8.83225 10.7793 8.78688 10.7288C8.68583 10.6162 8.68589 10.5068 8.78707 10.3943C8.83249 10.3438 9.2949 10.1967 10.2197 9.90258C13.9687 8.7101 15.679 6.21391 16.3943 2.34763C16.5396 1.56245 16.6123 1.16987 16.662 1.11652C16.764 1.00709 16.905 1.00183 17.0148 1.10336C17.0684 1.15286 17.1694 1.53666 17.3716 2.30424C18.3758 6.11775 20.0112 8.57541 23.23 9.81955C24.0727 10.1453 24.4941 10.3081 24.5359 10.3591C24.631 10.4752 24.6285 10.5747 24.5277 10.6858C24.4835 10.7346 24.0539 10.8765 23.1948 11.1603C19.7525 12.2972 18.031 14.9376 16.9893 19.4531C16.8668 19.9839 16.8056 20.2493 16.753 20.3006C16.6496 20.4016 16.4985 20.3993 16.3982 20.2952C16.3472 20.2423 16.2943 19.9761 16.1884 19.4437C15.2959 14.9561 13.9179 12.4033 10.2214 11.2229Z"
                                            fill="#fff"
                                        />
                                    </svg>
                                </button>
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '2rem',
                                        right: '1.5rem',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        justifyContent: 'flex-start',
                                    }}
                                >
                                    {[0, 1, 2, 3, 4, 5].map((c) => (
                                        <div
                                            key={c}
                                            onClick={() => onChangeBuildingColor(c)}
                                            style={{
                                                border: '1px solid #000',
                                                margin: '0.3rem',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    width: '1rem',
                                                    height: '1rem',
                                                    backgroundColor: PALLETE[c],
                                                }}
                                            >
                                                {' '}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'row',
                                    flexWrap: 'nowrap',
                                    justifyContent: 'space-between',
                                    marginBottom: '1rem',
                                    marginTop: '1rem',
                                }}
                            >
                                <button onClick={prevBottom}>
                                    <ArrowLeftIcon width={24} height={24} />
                                </button>
                                <button onClick={nextBottom}>
                                    <ArrowRightIcon width={24} height={24} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'row',
                    flexWrap: 'nowrap',
                    justifyContent: 'space-between',
                    width: '100rem',
                    margin: '2rem auto',
                }}
            >
                {errors.length > 0 ? (
                    <div style={{ color: 'red', width: '50rem', padding: '0 1rem' }}>
                        {errors.map((err, idx) => (
                            <strong key={idx}>{err}</strong>
                        ))}
                    </div>
                ) : (
                    <div style={{ width: '50rem' }}>{status}</div>
                )}
                <div
                    style={{
                        width: '50rem',
                        background: '#24202b',
                        display: 'flex',
                        height: '5rem',
                        flexDirection: 'row',
                        borderRadius: '0.5rem',
                        border: '2px solid #000',
                    }}
                >
                    <button onClick={exportFiles} style={{ width: '20rem' }}>
                        Export
                    </button>
                    <button onClick={applyFiles} style={{ width: '20rem' }}>
                        Apply
                    </button>
                </div>
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
                            <NavPanel />
                            <BuildingFabricator />
                            {config && <div className="build-version">build v0.1-{config.commit}</div>}
                        </InventoryProvider>
                    </SessionProvider>
                </GameStateProvider>
            </WalletProviderProvider>
        </UnityMapProvider>
    );
}
