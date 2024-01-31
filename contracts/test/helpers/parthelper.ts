import { CompoundKeyEncoder, DOWNSTREAM_GAME_ACTIONS, NodeSelectors, encodeActionData } from "@downstream/core";
import hre from "hardhat";
import path from 'path';
import { Hex, PublicClient, encodeAbiParameters } from "viem";
import fs from 'fs';
import { z } from 'zod';
import { encodePartKindActionDefID, encodePartKindID, getOpsForManifests } from '../../../cli/src/utils/applier';
import { ContractSource, Manifest, ManifestDocument, PartKindSpec, PartSpec, parseManifestDocuments } from '../../../cli/src/utils/manifest';
import { compilePath, compileString } from '../../../cli/src/utils/solidity';

const compiler = async (source: z.infer<typeof ContractSource>, manifestDir: string): Promise<string> => {
    const relativeFilename = path.join(manifestDir, source.file || 'inline.sol');
    const libs = [path.join(path.dirname(relativeFilename)), ...(source.includes || [])];
    const remappings = [
        ['@ds/', path.join(__dirname, '../../src/')],
        ['cog/', path.join(__dirname, '../../lib/cog/contracts/src/')],
    ];
    const opts = {libs, remappings, verbose: true};
    const { bytecode } = await (source.source ? compileString(source.source, relativeFilename, opts) : source.file
        ? compilePath(relativeFilename, opts)
        : {bytecode: source.bytecode}
    );
    return bytecode;
};

export type Dispatcher = (action: Hex) => Promise<Hex>;
export type DataGetter = (nodeID: Hex, label: string) => Promise<Hex>;

export class PartHelper {

    kind: PartKindHelper;
    spec: z.infer<typeof PartSpec>;
    dispatch: Dispatcher;
    getData: DataGetter;
    publicClient: PublicClient;

    constructor(publicClient: PublicClient, dispatcher: Dispatcher, getData: DataGetter, kind: PartKindHelper, spec: z.infer<typeof PartSpec>) {
        this.publicClient = publicClient;
        this.dispatch = dispatcher;
        this.kind = kind;
        this.spec = spec;
        this.getData = getData;
    }

    id(): Hex {
        return CompoundKeyEncoder.encodeInt16(NodeSelectors.Part, 0,
            this.spec.location[0],
            this.spec.location[1],
            this.spec.location[2],
        ) as Hex;
    }

    async getState(stateName: string, elementIndex?: number): Promise<number> {
        const stateVarIndex = (this.kind.spec.state || []).findIndex(s => s.name === stateName);
        const stateVarElmIndex = elementIndex ?? 0;
        if (stateVarIndex < 0) {
            throw new Error(`no state var: ${stateName}`);
        }
        const dataKind = 0; // 0=statevar, 1=partvar
        const label = `${dataKind}_${stateVarIndex}_${stateVarElmIndex}`;
        const data = await this.getData(this.id(), label);
        return Number(BigInt.asIntN(64, BigInt(data)));
    }

    async call(actionName: string, args?: {[key: string]: any}): Promise<Hex> {
        if (!this.kind || !this.kind.spec) {
            throw new Error('no kind set');
        }
        const partActionDefIndex = (this.kind.spec.actions || []).findIndex(a => a.name === actionName);
        if (partActionDefIndex < 0) {
            throw new Error(`no action named ${actionName} to call`);
        }
        const partActionDef = (this.kind.spec.actions || [])[partActionDefIndex];
        if (!partActionDef) {
            throw new Error('no action def');
        }
        const actionDefId = encodePartKindActionDefID(this.kind.id(), partActionDefIndex);
        const argTypes = (partActionDef.args || []).map(({name, type}) => ({ name, type}));
        const argValues = (partActionDef.args || []).map(({name}) => args ? args[name] : null);
        const argsEncoded = encodeAbiParameters(argTypes, argValues);
        const action = encodeActionData(
            DOWNSTREAM_GAME_ACTIONS,
            'CALL_ACTION_ON_PART',
            [this.id(), actionDefId, argsEncoded],
        );
        return this.dispatch(action as Hex);
    }
}

export class PartKindHelper {

    spec: z.infer<typeof PartKindSpec>;
    dispatch: Dispatcher;
    getData: DataGetter;
    publicClient: PublicClient;

    constructor(publicClient: PublicClient, dispatcher: Dispatcher, getData: DataGetter, spec: z.infer<typeof PartKindSpec>) {
        this.dispatch = dispatcher;
        this.getData = getData;
        this.spec = spec;
        this.publicClient = publicClient;
    }

    id() {
        return encodePartKindID(this.spec.name)
    }

    async spawn(location: [number,number,number]): Promise<PartHelper> {
        const action = encodeActionData(DOWNSTREAM_GAME_ACTIONS, 'SPAWN_PART', [this.id(), ...location]);
        await this.dispatch(action as Hex);
        return new PartHelper(this.publicClient, this.dispatch, this.getData, this, {name: 'wat', location});
    }
}

// We define a fixture to reuse the same setup in every test.
// We use loadFixture to run this setup once, snapshot that state,
// and reset Hardhat Network to that snapshot in every test.
export async function deployDownstream() {
    const publicClient = await hre.viem.getPublicClient();
    const [walletClient] = await hre.viem.getWalletClients();

    const ds = await hre.viem.deployContract("DownstreamGame", [], {});
    const dispatcher = await hre.viem.getContractAt("BaseDispatcher", await ds.read.getDispatcher(), {});
    const state = await hre.viem.getContractAt("BaseState", await ds.read.getState(), {});

    const partsRule = await hre.viem.deployContract("PartKindRule", [ds.address], {});
    await dispatcher.write.registerRule([partsRule.address]);

    const pluginRule = await hre.viem.deployContract("PluginRule", [], {});
    await dispatcher.write.registerRule([pluginRule.address]);

    const dispatch: Dispatcher = async (action: Hex): Promise<Hex> => {
        const hash = await dispatcher.write.dispatch([[action]]);
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
    }

    const getData = async (partID: Hex, label: string): Promise<Hex> => {
        const x = await state.read.getData([partID, label])
        return x;
    }

    const apply = async (manifests: any[]) => {
        const docs = manifests
            .map((content: any) => {
                const result = Manifest.safeParse(content);
                if (!result.success) {
                    throw new Error(
                        result.error.issues
                        .map(
                            (iss) =>
                            `invalid manifest: ${content.kind || ''} ${iss.path.join(
                                '.'
                            )} field invalid: ${iss.message}`
                        )
                        .join('\n\n')
                    );
                }
                return ManifestDocument.safeParse({ manifest: result.data, filename: 'inline' });
            })
            .map((result) => {
                if (!result.success) {
                    throw new Error(
                        result.error.issues.map((iss) => `${iss.path.join('.')} ${iss.message}`).join('\n\n')
                    );
                }
                return result.data;
            });
        const world = [] as any; // FIXME required for deploying anything that needs the world
        const buildingKinds = [] as any; // FIXME required for deploying anything that needs the buildingkinds

        const opsets = await getOpsForManifests(docs, world, buildingKinds, compiler);
        const actions = opsets
            .flatMap((opset) => opset.flatMap((op) => op.actions));
        for (let i=0; i<actions.length; i++) {
            const data = encodeActionData(DOWNSTREAM_GAME_ACTIONS, actions[i].name, actions[i].args);
            await dispatch(data as Hex);
        }
    }

    const newPartKind = async (spec: z.infer<typeof PartKindSpec>) => {
        const manifest = {kind: 'PartKind', spec};
        await apply([manifest]);
        return new PartKindHelper(publicClient, dispatch, getData, spec);
    }

    return {
        ds,
        dispatcher,
        apply,
        publicClient,
        walletClient,
        newPartKind,
    };
}


export function loadPartKindManifest(partKindFile: string): z.infer<typeof PartKindSpec> {
    const partKindYaml = fs.readFileSync(partKindFile).toString();
    const partKindDocs = parseManifestDocuments(partKindYaml, partKindFile);
    const partKindSpec = partKindDocs
        .map(doc => doc.manifest)
        .filter(manifest => manifest.kind === 'PartKind')
        .map(manifest => manifest.spec)
        .find(() => true);
    if (!partKindSpec) {
        throw new Error(`loadPartKindManifest failed for ${partKindFile}: no PartKind spec found`);
    }
    return partKindSpec as z.infer<typeof PartKindSpec>;
}
