import { ethers } from 'ethers';
import { concatMap, fromPromise, fromValue, makeSubject, pipe, publish, share, tap } from 'wonka';
import { Logger } from './logger';
import {
    CogAction,
    CogServices,
    CogSession,
    DispatchedActionsStatus,
    QueuedClientAction,
    QueuedSequencerAction,
    RejectedClientAction,
    Wallet,
} from './types';

// we store sessions globally in memory at the moment
// TODO: some kind of session store / local storage
const sessions = new Map<string, CogSession>();

// global sequence for local queue id
// TODO: uuid? Source?
const queueseq = { id: 1 };

export type Dispatcher = ReturnType<typeof makeDispatcher>;

/**
 * makeDispatcher creates a dispatch queue dedicated to the given wallet.
 * A dispatch function is returned which wraps the logic for lazily finding or
 * creating a session key for signing the transactions.
 *
 * subscribe to the returned `dispatched` source to see the results of
 * processing the queue.
 *
 * subscribe to the returned `pending` source to the see items arrive on the queue.
 *
 * the dispatching process is automatically subscribed to. to unsubscribe from it
 * and tear it down call the returned `disconnect` function.
 *
 */
export function makeDispatcher(client: CogServices, wallet: Wallet, logger: Logger) {
    const { source: pending, next } = makeSubject<QueuedClientAction>();

    const dispatching = pipe(
        pending,
        tap((q) => logger.info(`send ${q.actions.map((a) => a.name).join(', ')}`)),
        concatMap((queuedAction) =>
            fromValue(
                dispatch(client, wallet, queuedAction)
                    .then((dispatchedAction) => {
                        queuedAction.resolve(dispatchedAction);
                        return dispatchedAction;
                    })
                    .catch((err) => {
                        queuedAction.reject(err);
                        return {
                            ...queuedAction,
                            status: DispatchedActionsStatus.REJECTED_CLIENT,
                            error: `${err}`,
                        } satisfies RejectedClientAction;
                    }),
            ),
        ),
        share,
    );

    const dispatched = pipe(
        dispatching,
        concatMap((dispatchedAction) => fromPromise(dispatchedAction)),
    );

    pipe(
        dispatched,
        tap((q) =>
            q.status == DispatchedActionsStatus.REJECTED_CLIENT && q.error
                ? logger.error(`fail ${q.error}`)
                : undefined,
        ),
        publish,
    );

    // TODO: subscribe to transaction status to build a "commits/rejected" pile

    return {
        dispatched,
        dispatch: async (...actions: CogAction[]): Promise<QueuedSequencerAction> => {
            return new Promise((resolve, reject) => {
                next({
                    status: DispatchedActionsStatus.QUEUED_CLIENT,
                    clientQueueId: `${queueseq.id++}`,
                    actions,
                    resolve,
                    reject,
                });
            });
        },
        active: (): boolean => {
            const currentSession = sessions.get(wallet.address);
            return currentSession ? currentSession.expires > Date.now() : false;
        },
        login: () => findOrCreateSession(client, wallet),
        load: async (key: ethers.Wallet, expires: number) => {
            const owner = await wallet.signer();
            const session = {
                key,
                expires,
                owner,
                dispatch: (...bundle: CogAction[]) => client.dispatch(key, ...bundle),
                signout: () => client.signout(owner, key.address),
            };
            return sessions.set(wallet.address, session).get(wallet.address);
        },
    };
}

/**
 * findOrCreateSession triggers a cog signin to create a session key for the
 * provided wallet, or uses an existing session key for the address if one is
 * found.
 *
 * currently only an in-memory session cache is implemented.
 *
 */
async function findOrCreateSession(client: CogServices, wallet: Wallet): Promise<CogSession | undefined> {
    const currentSession = sessions.get(wallet.address);
    return currentSession && currentSession.expires > Date.now()
        ? currentSession
        : await wallet
              .signer()
              .then((signer) => client.signin(signer))
              .then((session) => sessions.set(wallet.address, session).get(wallet.address));
}

/**
 * dispatch executes the given bundle of actions by requesting a session
 * key for the given wallet, then signing and sending it on to cog
 */
async function dispatch(client: CogServices, wallet: Wallet, bundle: QueuedClientAction) {
    const session = await findOrCreateSession(client, wallet);
    if (!session) {
        throw new Error(`no valid session`);
    }
    const { data, error } = await session.dispatch(...bundle.actions);
    if (error) {
        let reason = error.toString();
        if (error.graphQLErrors && error.graphQLErrors.length > 0) {
            reason = error.graphQLErrors[0].toString();
        }
        throw new Error(reason);
    }
    if (!data) {
        throw new Error(`invalid response from sequencer, try again later`);
    }
    return {
        ...bundle,
        seqQueueId: data.dispatch.id,
        status: DispatchedActionsStatus.QUEUED_SEQUENCER,
    } satisfies QueuedSequencerAction;
}
