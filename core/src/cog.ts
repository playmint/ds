import {
    cacheExchange,
    createClient as createHTTPClient,
    dedupExchange,
    fetchExchange,
    OperationResult,
    subscriptionExchange,
    TypedDocumentNode,
} from '@urql/core';
// import { devtoolsExchange } from '@urql/devtools';
import { ethers } from 'ethers';
import { createClient as createWSClient } from 'graphql-ws';
import {
    concat,
    debounce,
    filter,
    fromPromise,
    fromValue,
    interval,
    lazy,
    makeSubject,
    map,
    pipe,
    share,
    Source,
    switchMap,
} from 'wonka';
import { Actions__factory } from './abi';
import { DispatchDocument, OnEventDocument, SigninDocument, SignoutDocument } from './gql/graphql';
import { AnyGameSubscription, AnyGameVariables, CogAction, CogEvent, CogQueryConfig, GameConfig } from './types';
// import { cacheExchange } from '@urql/exchange-graphcache';
// import cogSchema from './gql/introspection';

const EXPIRES_MILLISECONDS = 1000 * 60 * 60 * 12; // 12hrs

const abi = ethers.AbiCoder.defaultAbiCoder();

export const DOWNSTREAM_GAME_ACTIONS = Actions__factory.createInterface();

const DOWNSTREAM_AUTH_MESSAGE = (addr: string, ttl: number) =>
    [
        'Welcome to Downstream!',
        '\n\nThis site is requesting permission to interact with your Downstream assets.',
        '\n\nSigning this message will not incur any fees.',
        '\n\nYou can revoke sessions and read more about them at https://downstream.com/sessions',
        '\n\nPermissions: send-actions, spend-energy',
        '\n\nValid: ' + ttl + ' blocks',
        '\n\nSession: ',
        addr,
    ].join('');

const DOWNSTREAM_GAME_ID = 'DOWNSTREAM';

const cogDefaultConfig = {
    gameID: DOWNSTREAM_GAME_ID,
    authMessage: DOWNSTREAM_AUTH_MESSAGE,
    actions: DOWNSTREAM_GAME_ACTIONS,
    wsEndpoint: 'ws://localhost:8080/query',
    httpEndpoint: 'http://localhost:8080/query',
} satisfies GameConfig;

/**
 * makeGameClient returns a Source of cog clients and a setConfig func. The cog
 * client manages the connection to the graphql endpoint and handles the
 * encoding and signing of actions.
 *
 * each time setConfig is called, the client will be reconfigured and emitted
 * on the source.
 *
 * Given configure is merged with the internal default config for downstream +
 * the initial given config + whatever is passed to setConfig.
 *
 */
export function makeCogClient(initialConfig: Partial<GameConfig>) {
    let prev = configureClient({ ...cogDefaultConfig, ...initialConfig });
    const { source, next } = makeSubject<typeof prev>();
    const setConfig = (cfg: Partial<GameConfig>) => {
        prev = configureClient({ ...cogDefaultConfig, ...initialConfig, ...cfg });
        next(prev);
    };
    const client = lazy(() => concat([fromValue(prev), source]));
    return { client, setConfig };
}

export function configureClient({
    httpFetchImpl,
    httpEndpoint,
    wsEndpoint,
    wsSocketImpl,
    actions: iactions,
    authMessage,
    gameID,
}: GameConfig) {
    const wsClient = createWSClient({
        url: wsEndpoint,
        webSocketImpl: wsSocketImpl ? wsSocketImpl : WebSocket,
    });

    const gql = createHTTPClient({
        url: httpEndpoint,
        fetch: httpFetchImpl ? httpFetchImpl : fetch,
        exchanges: [
            // devtoolsExchange, // TODO: allow enabling this from config
            dedupExchange,
            cacheExchange,
            // cacheExchange({
            //     schema: cogSchema,
            //     // updates: {
            //     //     Subscription: {
            //     //         events: invalidateCacheOnSubscriptionEvent,
            //     //     },
            //     // },
            // }),
            fetchExchange,
            subscriptionExchange({
                forwardSubscription: (request) => ({
                    subscribe: (sink) => ({
                        unsubscribe: wsClient.subscribe(request, sink),
                    }),
                }),
            }),
        ],
    });

    const signout = async (signer: ethers.Signer, session: string): Promise<void> => {
        const msg = ethers.concat([ethers.toUtf8Bytes(`You are signing out of session: `), ethers.getBytes(session)]);
        const auth = await signer.signMessage(msg);
        await gql.mutation(SignoutDocument, { gameID, session, auth }, { requestPolicy: 'network-only' }).toPromise();
        return;
    };

    const dispatch = async (signer: ethers.Signer, ...unencodedActions: CogAction[]) => {
        const actions = unencodedActions.map((action) => encodeActionData(iactions, action.name, action.args));
        const actionDigest = ethers.getBytes(
            ethers.keccak256(abi.encode(['bytes[]'], [actions.map((action) => ethers.getBytes(action))])),
        );
        const auth = await signer.signMessage(actionDigest);
        return gql.mutation(DispatchDocument, { gameID, auth, actions }, { requestPolicy: 'network-only' }).toPromise();
    };

    const signin = async (owner: ethers.Signer) => {
        const key = ethers.Wallet.createRandom();
        const scope = '0xffffffff';
        const ttl = 25000; // ~13hrs
        const msg = authMessage(key.address.toLowerCase(), ttl);
        const auth = await owner.signMessage(msg);
        const res = await gql
            .mutation(
                SigninDocument,
                { gameID, auth, ttl, scope, session: key.address },
                { requestPolicy: 'network-only' },
            )
            .toPromise();
        if (res.error) {
            throw new Error(`signin mutation fail: ${res.error}`);
        }
        return {
            key,
            expires: Date.now() + EXPIRES_MILLISECONDS,
            owner,
            dispatch: (...bundle: CogAction[]) => dispatch(key, ...bundle),
            signout: () => signout(owner, key.address),
        };
    };

    const subscription = <
        Data extends TypedDocumentNode<AnyGameSubscription, Variables>,
        Variables extends AnyGameVariables = AnyGameVariables,
    >(
        doc: Data,
        vars: Variables,
    ) =>
        pipe(
            gql.subscription(doc, vars, { requestPolicy: 'network-only' }),
            map((res) => {
                if (res.error) {
                    console.warn('cog query error:', res.error);
                    return undefined;
                }
                if (!res.data) {
                    console.warn('cog query fail: returned no data');
                    return undefined;
                }
                return res.data.events;
            }),
            filter((data): data is AnyGameSubscription['events'] => !!data),
            debounce(() => 500),
            share,
        );

    const events = subscription(OnEventDocument, { gameID });

    // query executes a query which will get re-queried each time new data arrives
    // right now this is implemented rather naively (ANY new events causes ALL
    // queries to be re-run), we can do better with caching in the future
    const query = <Data = any, Variables extends AnyGameVariables = AnyGameVariables>(
        doc: TypedDocumentNode<Data, Variables>,
        vars: Variables,
        config?: CogQueryConfig,
    ): Source<Data> =>
        pipe(
            config?.subscribe === false
                ? lazy(() => fromValue(CogEvent.STATE_CHANGED)) // no subscription, just do the query once
                : concat([
                      lazy(() => fromValue(CogEvent.STATE_CHANGED)), // always emit one to start
                      typeof config?.poll === 'undefined'
                          ? pipe(
                                // emit signal on notify of state update from events
                                events,
                                map(() => CogEvent.STATE_CHANGED),
                            )
                          : pipe(
                                // emit signal periodically
                                interval(config.poll),
                                map(() => CogEvent.STATE_CHANGED),
                            ),
                  ]),
            switchMap(() =>
                pipe(
                    fromPromise(gql.query(doc, vars, { requestPolicy: 'cache-and-network' }).toPromise()),
                    map((res) => {
                        if (res.error) {
                            console.warn('cog query error:', res.error);
                            return undefined;
                        }
                        if (!res.data) {
                            console.warn('cog query fail: returned no data');
                            return undefined;
                        }
                        return res;
                    }),
                    filter((res): res is OperationResult<Data, Variables> => typeof res !== 'undefined'),
                    map((res) => res.data),
                    filter((data): data is Data => typeof data !== 'undefined'),
                ),
            ),
        );

    return { gameID, signin, signout, query, subscription, dispatch };
}

/**
 * encodeActionData is like ethers encodeFunctionData but specifically for game
 * actions
 *
 * it will attempt to cast any given arguments to their expected types via
 * actionArgFromUnknown
 *
 */
function encodeActionData(actions: ethers.Interface, name: string, givenArgs: unknown[]) {
    const fn = actions.getFunction(name);
    if (!fn) {
        throw new Error(`invalid action: ${name}`);
    }
    if (fn.inputs.length != givenArgs.length) {
        throw new Error(`invalid number of args: wanted ${fn.inputs.length} got ${givenArgs.length}`);
    }
    const args = fn.inputs.map((wanted, idx) => actionArgFromUnknown(wanted, givenArgs[idx]));
    return actions.encodeFunctionData(name, args);
}

/**
 * actionArgFromUnknown attempts to guess at any required casts to the expected
 * argument types ethers does not try very hard (rightfuly so) to do these
 * conversions, but we generally know that the args are probably from node
 * ids/keys and so can do a pretty good job of guessing the intensions.
 *
 */
export function actionArgFromUnknown(wanted: ethers.ParamType, given: unknown): any {
    // if we are given a BigInt then assume they know what they are doing
    if (typeof given === 'bigint') {
        return given;
    }
    // if wanted type is a uint, then things are probably fine
    if (wanted.baseType.startsWith('uint')) {
        return given;
    }
    // if wanted type is signed int, then things get messy...
    if (wanted.baseType.startsWith('int')) {
        // we will assume if someone has given us a 0x prefix value for their signed integer
        // at this point that it probably needs converting to twos compliment
        if (typeof given === 'string' && ethers.isHexString(given)) {
            const width = parseInt(wanted.baseType.slice(3), 10);
            return BigInt(ethers.fromTwos(given, width));
        } else if (typeof given === 'number') {
            return given;
        } else {
            return given;
        }
    }
    // if wanted is bytes, then convert to bytes
    if (wanted.baseType.startsWith('bytes')) {
        if (typeof given === 'string') {
            if (given === '') {
                return ethers.getBytes('0x');
            } else {
                return ethers.getBytes(given);
            }
        } else if (Array.isArray(given)) {
            if (given.length === 0) {
                return '0x';
            }
        }
    }
    // else hope for the best
    return given;
}
