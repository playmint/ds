import {
    createClient as createHTTPClient,
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
    merge,
    pipe,
    share,
    Source,
    switchMap,
    take,
    tap,
    toPromise,
} from 'wonka';
import { Actions__factory } from './abi';
import { DispatchDocument, OnEventDocument, SigninDocument, SignoutDocument } from './gql/graphql';
import { AnyGameSubscription, AnyGameVariables, CogAction, CogQueryConfig, GameConfig } from './types';

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
export function makeCogClient(initialConfig?: Partial<GameConfig>) {
    let prev = initialConfig ? configureClient({ ...cogDefaultConfig, ...initialConfig }) : undefined;
    const { source, next } = makeSubject<ReturnType<typeof configureClient>>();
    const setConfig = (cfg: Partial<GameConfig>) => {
        prev = configureClient({ ...cogDefaultConfig, ...initialConfig, ...cfg });
        next(prev);
    };
    const client = lazy(() => (prev ? concat([fromValue(prev), source]) : source));
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

    const waiting = new Map<string, boolean>();

    const signout = async (signer: ethers.Signer, session: string): Promise<void> => {
        const msg = ethers.concat([ethers.toUtf8Bytes(`You are signing out of session: `), ethers.getBytes(session)]);
        const auth = await signer.signMessage(msg);
        await gql.mutation(SignoutDocument, { gameID, session, auth }, { requestPolicy: 'network-only' }).toPromise();
        return;
    };
    const { source: forcedSource, next: force } = makeSubject<string>();
    const forced = pipe(forcedSource, share);

    // nonce doesn't need to be unique forever... only unique within a short
    // lifespan of hours and only within the same session
    let nonceSeq = Math.floor(Math.random() * 100000);

    const dispatch = async (signer: ethers.Signer, optimistic: boolean, ...unencodedActions: CogAction[]) => {
        const actions = unencodedActions.map((action) => encodeActionData(iactions, action.name, action.args));
        nonceSeq++;
        const nonce = nonceSeq;
        const actionDigest = ethers.getBytes(
            ethers.keccak256(
                abi.encode(['bytes[]', 'uint256'], [actions.map((action) => ethers.getBytes(action)), nonce]),
            ),
        );
        const auth = await signer.signMessage(actionDigest);

        waiting.set(auth, true);
        const waiter: Promise<boolean> = pipe(
            events,
            filter((evt) => evt.simulated === false && evt.sigs.some((sig) => sig === auth)),
            map(() => true),
            take(1),
            toPromise,
        );

        return gql
            .mutation(DispatchDocument, { gameID, auth, actions, nonce, optimistic }, { requestPolicy: 'network-only' })
            .toPromise()
            .then((res) => {
                if (res.error) {
                    waiting.delete(auth);
                    return {
                        ...res,
                        wait: () => Promise.resolve(false),
                    };
                }
                force(auth);
                return {
                    ...res,
                    wait: () => waiter,
                };
            })
            .finally(() => setTimeout(() => waiting.delete(auth), 6000));
    };

    const signin = async (owner: ethers.Signer) => {
        const rnd = ethers.Wallet.createRandom();
        const key: ethers.Wallet = new ethers.Wallet(rnd.privateKey);
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
            dispatch: (...bundle: CogAction[]) => dispatch(key, true, ...bundle),
            dispatchAndWait: (...bundle: CogAction[]) => dispatch(key, false, ...bundle),
            signout: () => signout(owner, key.address),
        };
    };

    let lastSeenBlock: number | undefined;
    const { source: blockSource, next: nextBlock } = makeSubject<number>();
    const blockPipe = pipe(blockSource, share);
    const block = lazy(() => (lastSeenBlock ? concat([fromValue(lastSeenBlock), blockPipe]) : blockPipe));

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
            tap((data) => {
                if (data.block && data.simulated === false && (!lastSeenBlock || data.block > lastSeenBlock)) {
                    lastSeenBlock = data.block;
                    nextBlock(lastSeenBlock);
                }
            }),
            filter((data): data is AnyGameSubscription['events'] => Array.isArray(data.sigs) && data.sigs.length > 0),
            share,
        );

    const events = subscription(OnEventDocument, { gameID });

    const externalEvents = pipe(
        events,
        filter((data) => {
            const isExternalUpdate = !data.simulated || data.sigs.some((sig) => !waiting.has(sig));
            return isExternalUpdate;
        }), // ignore the update if they are all waiting as we force the same update in dispatch
        debounce(() => 250),
        tap((data) => console.log('EXTERNAL UPDATE', data)),
        map(() => ''),
        share,
    );

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
                ? lazy(() => fromValue('')) // no subscription, just do the query once
                : concat([
                      lazy(() => fromValue('')), // always emit one to start
                      typeof config?.poll === 'undefined'
                          ? merge([externalEvents, forced])
                          : pipe(
                                // emit signal periodically
                                interval(config.poll),
                                map(() => ''),
                            ),
                  ]),
            switchMap(() =>
                pipe(
                    fromPromise(gql.query(doc, vars, { requestPolicy: 'network-only' }).toPromise()),
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

    return { gameID, signin, signout, query, subscription, dispatch, block };
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

// function sleep(ms: number): Promise<void> {
//     return new Promise((resolve) => setTimeout(resolve, ms));
// }
