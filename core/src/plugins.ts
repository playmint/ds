import * as Comlink from 'comlink';
import {
    Source,
    concat,
    concatMap,
    debounce,
    fromPromise,
    fromValue,
    lazy,
    map,
    pipe,
    share,
    switchMap,
    tap,
    zip,
} from 'wonka';
import * as apiv1 from './api/v1';
import { AvailablePluginFragment, GetAvailablePluginsDocument } from './gql/graphql';
import { Logger } from './logger';
import {
    ActivePlugin,
    CogAction,
    CogServices,
    DispatchFunc,
    GameState,
    PluginConfig,
    PluginDispatchFunc,
    PluginSubmitCallValues,
    PluginTrust,
    PluginType,
    PluginUpdateResponse,
    QueuedSequencerAction,
    Sandbox,
    Selection,
} from './types';
import { getBagsAtEquipee, getBuildingAtTile } from './utils';
import { ZoneWithBags } from './world';
import { ethers } from 'ethers';

/**
 * makeAvailablePlugins polls for the list of deployed plugins every now and
 * then (60s).
 *
 * we don't fetch on every subscription notification because this list could be
 * large and is not important that it is right up to date.
 *
 */
export function makeAvailablePlugins(client: Source<CogServices>) {
    let prev: AvailablePluginFragment[] | undefined;

    const source = pipe(
        client,
        switchMap(({ query, gameID }) =>
            pipe(
                query(GetAvailablePluginsDocument, { gameID }, { poll: 60 * 1000 }),
                map(({ game }) => game.state.plugins),
            ),
        ),
        tap((next) => (prev = next)),
        share,
    );

    const plugins = lazy(() => (prev ? concat([fromValue(prev), source]) : source));
    return { plugins };
}

/**
 * noopDispatcher throws away dispatch calls and just logs them. it is used
 * when a plugin attempts to call dispatch but there is no connected player to
 * dispatch for.
 */
async function noopDispatcher(..._actions: CogAction[]): Promise<QueuedSequencerAction> {
    throw new Error('dispatch failed: attempt to dispatch without a connected player');
}

const activeBySandbox = new WeakMap<Object, Map<string, ActivePlugin>>();

type PluginExecutor = () => Promise<(PluginUpdateResponse | null)[]>;

/**
 * makePluginUI sends the current State to each wanted plugin and returns a
 * stream of all the normalized plugin responses.
 */
export function makePluginUI(
    plugins: Source<PluginConfig[]>,
    sandbox: Comlink.Remote<Sandbox>,
    logMessage: Logger,
    questMessage: Logger,
    state: Source<GameState>,
    block: Source<number>,
) {
    return pipe(
        zip<any>({ plugins, state, block }),
        debounce(() => 250),
        map<any, PluginExecutor>(
            ({ state, plugins, block }: { state: GameState; plugins: PluginConfig[]; block: number }) =>
                async () => {
                    if (!activeBySandbox.has(sandbox)) {
                        const m = new Map<string, ActivePlugin>();
                        activeBySandbox.set(sandbox, m);
                    }
                    const active = activeBySandbox.get(sandbox)!;
                    try {
                        await sandbox.setState(
                            {
                                player: state.player
                                    ? {
                                          id: state.player.id,
                                          addr: state.player.addr,
                                          zone: state.player.zone,
                                          tokens: state.player.tokens,
                                      }
                                    : undefined,
                                world: {
                                    ...(state.zone || {}),
                                    sessions: [],
                                },
                                selected: state.selected,
                            },
                            block,
                        );
                    } catch (err: any) {
                        if (err?.message && err?.message == 'SANDBOX_OOM') {
                            const dummy: PluginUpdateResponse = {
                                config: {
                                    id: 'dummy',
                                    name: 'just-here-to-pass-the-oom-error',
                                    type: PluginType.CORE,
                                    trust: PluginTrust.UNTRUSTED,
                                    src: '',
                                    kindID: '',
                                },
                                state: {
                                    components: [],
                                    map: [],
                                },
                                error: 'SANDBOX_OOM',
                            };
                            return [dummy];
                        }
                        return [];
                    }
                    return Promise.all(
                        plugins.map(async (p): Promise<PluginUpdateResponse | null> => {
                            let plugin: ActivePlugin | null | undefined;
                            try {
                                const { player } = state;
                                const dispatch = player ? player.dispatch : noopDispatcher;
                                if (!p.id) {
                                    console.warn(`plugin has no id, skipping`);
                                    return null;
                                }
                                plugin = active.has(p.id)
                                    ? active.get(p.id)
                                    : state.zone.buildings.some((building) => building?.kind?.id === p.kindID) ||
                                      state.global.items.some((item) => item?.id === p.kindID)
                                    ? await loadPlugin(
                                          sandbox,
                                          dispatch,
                                          logMessage,
                                          questMessage.with({ name: p.kindID }),
                                          p,
                                      )
                                    : null;
                                if (!plugin) {
                                    return null;
                                }
                                active.set(p.id, plugin);
                                const res = await Promise.race([
                                    plugin.update().catch((err) => console.error(`plugin-error: ${p.id}:`, err)),
                                    sleep(1000).then(() => {}),
                                ]);
                                if (typeof res === 'undefined') {
                                    console.warn(`plugin-timeout: ${p.id} took longer than 1000ms`);
                                    return null;
                                }
                                return res;
                            } catch (err: any) {
                                if (err?.message && err?.message == 'SANDBOX_OOM') {
                                    return {
                                        config: p,
                                        state: {
                                            components: [],
                                            map: [],
                                        },
                                        error: 'SANDBOX_OOM',
                                    };
                                }
                                console.error(`Removing plugin ${p.id} from 'active' due to error`, err);
                                if (plugin) {
                                    await sandbox.deleteContext(plugin.context);
                                }
                                active.delete(p.id);
                                return null;
                            }
                        }),
                    );
                },
        ),
        concatMap((getPluginResponses) => fromPromise(getPluginResponses())),
        map((pluginResponses) => pluginResponses.filter((res): res is PluginUpdateResponse => !!res)),
        share,
    );
}

function isAutoloadableBuildingPlugin(
    p: AvailablePluginFragment,
    { tiles, mobileUnit }: Selection,
    zone: ZoneWithBags,
) {
    if (!p.supports) {
        return false;
    }
    if (!p.supports.metadata) {
        // FIXME: use src annotation not metadata
        return false;
    }
    if (p.alwaysActive?.value == 'true') {
        return true;
    }
    switch (pluginTypeForNodeKind(p.supports.kind)) {
        case PluginType.BUILDING:
            if (!tiles) {
                return false;
            }
            if (tiles.length !== 1) {
                return false;
            }
            const selectedTile = tiles.find(() => true);
            if (!selectedTile) {
                return false;
            }
            const selectedBuilding = getBuildingAtTile(zone.buildings, selectedTile);
            if (!selectedBuilding) {
                return false;
            }
            return p.supports.id == selectedBuilding.kind?.id;
        case PluginType.ITEM:
            if (!mobileUnit) {
                return false;
            }
            const unitItemKindIds = getBagsAtEquipee(zone.bags, mobileUnit).flatMap((bag) =>
                bag.slots.filter((slot) => slot.balance > 0).flatMap((slot) => slot.item.id),
            );
            return unitItemKindIds.some((id) => p.supports?.id === id);
        default:
            return false;
    }
}

/**
 * makeAutoloadPlugins returns a source of available plugin configs that are selected
 * based on the current selection state
 */
export function makeAutoloadPlugins(
    availablePlugins: Source<AvailablePluginFragment[]>,
    selection: Source<Selection>,
    zone: Source<ZoneWithBags>,
) {
    const plugins = pipe(
        availablePlugins,
        switchMap((availablePlugins) =>
            pipe(
                zone,
                switchMap((zone) => {
                    return pipe(
                        selection,
                        map((selection) =>
                            availablePlugins
                                .filter((p) => isAutoloadableBuildingPlugin(p, selection, zone))
                                .map(
                                    (p) =>
                                        ({
                                            id: p.id,
                                            name: p.name ? p.name.value : 'unnamed',
                                            src: p.src ? p.src.value : '',
                                            trust: PluginTrust.UNTRUSTED,
                                            type: pluginTypeForNodeKind(p.supports?.kind),
                                            kindID: p.supports?.id || '<invalid>', // TODO: filter out invalid
                                        } satisfies PluginConfig),
                                ),
                        ),
                    );
                }),
            ),
        ),
    ) satisfies Source<PluginConfig[]>;

    return { plugins };
}

/**
 * loadPlugin converts a PluginConfig into an ActivePlugin by loading it's
 * source into a sandboxed js runtime ready to recv update commands.
 *
 * loaded "guest" source has only limited access to communicate with the host:
 *
 * they can load one specific module `import ds from 'downstream'` which gives
 * them access to the following API:
 *
 * ```ts
 *
 * ds.dispatch({name: 'ACTION_NAME', args: []}) // sends an action as the player
 *
 * ds.log('hello') // prints a message to the game log
 *
 * ```
 *
 * other than than that, a plugin source is expected the implement a function
 * that will be called to render state:
 *
 * ```ts
 *
 * export default function update(state) {
 *      return {version: 1, components: []};
 * }
 *
 * ```
 *
 */
export async function loadPlugin(
    sandbox: Comlink.Remote<Sandbox>,
    dispatch: DispatchFunc,
    logMessage: Logger,
    questMessage: Logger,
    config: PluginConfig,
) {
    if (!config || !config.id) {
        throw new Error(`unabled to load plugin: no id provided`);
    }
    if (!config.src) {
        throw new Error(`unable to load plugin ${config.id}: no src`);
    }
    // create a flag that will be check to decide if
    // the api within the plugin is enabled or not.
    //
    // the api bindings are only usable when api.enabled = true
    //
    // during execution of an event handler this is the case,
    // but during background operation and during update calls
    // the api is disabled.
    //
    // this prevents a class of undesirable activities such as
    // plugins triggering dispatch calls on load or responding
    // to state changes in update

    const ERC20Approver = async (contractAddress: string, spenderAddress: string, amount: number) => {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, ERC20_ABI, signer);
        return contract.approve(spenderAddress, amount);
    };

    const ERC1155Approver = async (contractAddress: string, spenderAddress: string, amount: number) => {
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, ERC1155_ABI, signer);
        return contract.approve(spenderAddress, amount);
    };

    const pluginDispatch: PluginDispatchFunc = (...actions: CogAction[]) =>
        dispatch(...actions)
            .then(() => true)
            .catch(() => false);

    const context = await sandbox.newContext(
        Comlink.proxy(pluginDispatch),
        Comlink.proxy(logMessage),
        Comlink.proxy(questMessage),
        Comlink.proxy(ERC20Approver),
        Comlink.proxy(ERC1155Approver),
        config,
    );

    // setup the submit func
    const submitProxy = async (ref: string, values: PluginSubmitCallValues): Promise<void> => {
        console.log('submit', ref, values);
        const res = await sandbox.submit(context, { ref, values });
        console.log('submitted', ref, res);
    };

    // setup the update func
    const updateProxy = async (): Promise<PluginUpdateResponse> => {
        try {
            const pluginResponse = await sandbox.update(context);

            const _pluginResponse = (await sandbox.hasContext(context)) === true ? pluginResponse : {};
            return {
                config,
                state: apiv1.normalizePluginState(_pluginResponse, submitProxy),
            };
        } catch (err) {
            if (String(err).includes('SANDBOX_OOM') || String(err).includes('out of memory')) {
                throw new Error('SANDBOX_OOM');
            }
            console.error('plugin did not return an expected response object:', err);
            return {
                config,
                state: apiv1.normalizePluginState({}, submitProxy),
            };
        }
    };

    // loaded
    return {
        ...config,
        update: updateProxy,
        context,
    };
}

export function pluginTypeForNodeKind(kind: string | undefined): PluginType {
    switch (kind) {
        case 'BuildingKind':
            return PluginType.BUILDING;
        case 'Item':
            return PluginType.ITEM;
        default:
            console.warn('unknown plugin type for node kind:', kind);
            return PluginType.CORE;
    }
}

export function sleep(ms: number): Promise<null> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

const ERC20_ABI = [
    {
        constant: true,
        inputs: [],
        name: 'name',
        outputs: [
            {
                name: '',
                type: 'string',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            {
                name: '_spender',
                type: 'address',
            },
            {
                name: '_value',
                type: 'uint256',
            },
        ],
        name: 'approve',
        outputs: [
            {
                name: '',
                type: 'bool',
            },
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'totalSupply',
        outputs: [
            {
                name: '',
                type: 'uint256',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            {
                name: '_from',
                type: 'address',
            },
            {
                name: '_to',
                type: 'address',
            },
            {
                name: '_value',
                type: 'uint256',
            },
        ],
        name: 'transferFrom',
        outputs: [
            {
                name: '',
                type: 'bool',
            },
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'decimals',
        outputs: [
            {
                name: '',
                type: 'uint8',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: true,
        inputs: [
            {
                name: '_owner',
                type: 'address',
            },
        ],
        name: 'balanceOf',
        outputs: [
            {
                name: 'balance',
                type: 'uint256',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: true,
        inputs: [],
        name: 'symbol',
        outputs: [
            {
                name: '',
                type: 'string',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        constant: false,
        inputs: [
            {
                name: '_to',
                type: 'address',
            },
            {
                name: '_value',
                type: 'uint256',
            },
        ],
        name: 'transfer',
        outputs: [
            {
                name: '',
                type: 'bool',
            },
        ],
        payable: false,
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        constant: true,
        inputs: [
            {
                name: '_owner',
                type: 'address',
            },
            {
                name: '_spender',
                type: 'address',
            },
        ],
        name: 'allowance',
        outputs: [
            {
                name: '',
                type: 'uint256',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
    {
        payable: true,
        stateMutability: 'payable',
        type: 'fallback',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'owner',
                type: 'address',
            },
            {
                indexed: true,
                name: 'spender',
                type: 'address',
            },
            {
                indexed: false,
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'Approval',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                name: 'from',
                type: 'address',
            },
            {
                indexed: true,
                name: 'to',
                type: 'address',
            },
            {
                indexed: false,
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'Transfer',
        type: 'event',
    },
];

const ERC1155_ABI = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'operator',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'bool',
                name: 'approved',
                type: 'bool',
            },
        ],
        name: 'ApprovalForAll',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'operator',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256[]',
                name: 'ids',
                type: 'uint256[]',
            },
            {
                indexed: false,
                internalType: 'uint256[]',
                name: 'values',
                type: 'uint256[]',
            },
        ],
        name: 'TransferBatch',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: 'address',
                name: 'operator',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                indexed: true,
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'id',
                type: 'uint256',
            },
            {
                indexed: false,
                internalType: 'uint256',
                name: 'value',
                type: 'uint256',
            },
        ],
        name: 'TransferSingle',
        type: 'event',
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: 'string',
                name: 'value',
                type: 'string',
            },
            {
                indexed: true,
                internalType: 'uint256',
                name: 'id',
                type: 'uint256',
            },
        ],
        name: 'URI',
        type: 'event',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'id',
                type: 'uint256',
            },
        ],
        name: 'balanceOf',
        outputs: [
            {
                internalType: 'uint256',
                name: '',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: 'accounts',
                type: 'address[]',
            },
            {
                internalType: 'uint256[]',
                name: 'ids',
                type: 'uint256[]',
            },
        ],
        name: 'balanceOfBatch',
        outputs: [
            {
                internalType: 'uint256[]',
                name: '',
                type: 'uint256[]',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'account',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'operator',
                type: 'address',
            },
        ],
        name: 'isApprovedForAll',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256[]',
                name: 'ids',
                type: 'uint256[]',
            },
            {
                internalType: 'uint256[]',
                name: 'amounts',
                type: 'uint256[]',
            },
            {
                internalType: 'bytes',
                name: 'data',
                type: 'bytes',
            },
        ],
        name: 'safeBatchTransferFrom',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'from',
                type: 'address',
            },
            {
                internalType: 'address',
                name: 'to',
                type: 'address',
            },
            {
                internalType: 'uint256',
                name: 'id',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'amount',
                type: 'uint256',
            },
            {
                internalType: 'bytes',
                name: 'data',
                type: 'bytes',
            },
        ],
        name: 'safeTransferFrom',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address',
                name: 'operator',
                type: 'address',
            },
            {
                internalType: 'bool',
                name: 'approved',
                type: 'bool',
            },
        ],
        name: 'setApprovalForAll',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'bytes4',
                name: 'interfaceId',
                type: 'bytes4',
            },
        ],
        name: 'supportsInterface',
        outputs: [
            {
                internalType: 'bool',
                name: '',
                type: 'bool',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'uint256',
                name: 'id',
                type: 'uint256',
            },
        ],
        name: 'uri',
        outputs: [
            {
                internalType: 'string',
                name: '',
                type: 'string',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
];
