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
    filter,
    fromPromise,
    fromValue,
    interval,
    lazy,
    makeSubject,
    map,
    pipe,
    Source,
    switchMap,
} from 'wonka';
import { Actions__factory } from './abi';
import { DispatchDocument, SigninDocument, SignoutDocument } from './gql/graphql';
import { AnyGameVariables, CogAction, CogQueryConfig, GameConfig } from './types';

const EXPIRES_MILLISECONDS = 1000 * 60 * 60 * 12; // 12hrs

const abi = ethers.AbiCoder.defaultAbiCoder();

export const DOWNSTREAM_GAME_ACTIONS = Actions__factory.createInterface();
export const DOWNSTREAM_ACTIONS_ABI = Actions__factory.abi;

export const DOWNSTREAM_AUTH_MESSAGE = (addr: string, ttl: number) =>
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
    networkEndpoint: 'http://localhost:8545',
    networkID: '22300',
    networkName: 'hexwoodlocal',
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

    const signout = async (signer: ethers.Signer, session: string): Promise<void> => {
        const msg = ethers.concat([ethers.toUtf8Bytes(`You are signing out of session: `), ethers.getBytes(session)]);
        const auth = await signer.signMessage(msg);
        await gql.mutation(SignoutDocument, { gameID, session, auth }, { requestPolicy: 'network-only' }).toPromise();
        return;
    };

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

        return gql
            .mutation(DispatchDocument, { gameID, auth, actions, nonce, optimistic }, { requestPolicy: 'network-only' })
            .toPromise()
            .then((res) => {
                if (res.error) {
                    return {
                        ...res,
                    };
                }
                // force(auth);
                return {
                    ...res,
                };
            });
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
                      pipe(
                          // emit signal periodically
                          interval(config?.poll || 1000),
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

    return { gameID, signin, signout, query, dispatch };
}

/**
 * encodeActionData is like ethers encodeFunctionData but specifically for game
 * actions
 *
 * it will attempt to cast any given arguments to their expected types via
 * actionArgFromUnknown
 *
 */
export function encodeActionData(actions: ethers.Interface, name: string, givenArgs: unknown[]) {
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
