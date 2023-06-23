import { makeSubject, pipe, subscribe, tap } from 'wonka';
import { Logger } from './logger';
import {
    CogAction,
    CogServices,
    CogSession,
    DispatchedAction,
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
    const { source: dispatched, next } = makeSubject<DispatchedAction>();

    // const dispatched = pipe(
    //     pending,
    //     tap((q) => logger.info(`pending ${q.actions.map((a) => a.name).join(', ')}`)),
    //     concatMap((queuedAction) => fromPromise(dispatch(client, wallet, queuedAction))),
    // );

    const { unsubscribe: disconnect } = pipe(
        dispatched,
        tap((q) =>
            q.status == DispatchedActionsStatus.REJECTED_CLIENT && q.error
                ? logger.error(`failed ${q.actions.map((a) => a.name).join(', ')}: ${q.error}`)
                : logger.info(`dispatched ${q.actions.map((a) => a.name).join(', ')}`),
        ),
        subscribe((a) => console.debug(`[wallet-${wallet.id}] dispatched`, a)), // TODO: remove debug
    );

    // TODO: subscribe to transaction status to build a "commits/rejected" pile

    return {
        dispatched,
        dispatch: async (...actions: CogAction[]): Promise<void> => {
            const res = await dispatch(client, wallet, {
                status: DispatchedActionsStatus.QUEUED_CLIENT,
                clientQueueId: `${queueseq.id++}`,
                actions,
            });
            next(res);
            return;
        },
        disconnect,
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
async function findOrCreateSession(client: CogServices, wallet: Wallet) {
    return sessions.has(wallet.address)
        ? sessions.get(wallet.address)
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
    try {
        const session = await findOrCreateSession(client, wallet);
        if (!session) {
            console.warn('dispatch-queue:', 'nosession');
            return {
                ...bundle,
                status: DispatchedActionsStatus.REJECTED_CLIENT,
                error: `no valid session`,
            } satisfies RejectedClientAction;
        }
        const { data, error } = await session.dispatch(...bundle.actions);
        if (error) {
            let reason = error.toString();
            if (error.graphQLErrors && error.graphQLErrors.length > 0) {
                reason = error.graphQLErrors[0].toString();
            }
            return {
                ...bundle,
                status: DispatchedActionsStatus.REJECTED_CLIENT,
                error: `${reason}`,
            } satisfies RejectedClientAction;
        }
        if (!data) {
            return {
                ...bundle,
                status: DispatchedActionsStatus.REJECTED_CLIENT,
                error: `invalid response from sequencer, try again later`,
            } satisfies RejectedClientAction;
        }
        return {
            ...bundle,
            seqQueueId: data.dispatch.id,
            status: DispatchedActionsStatus.QUEUED_SEQUENCER,
        } satisfies QueuedSequencerAction;
    } catch (err) {
        console.warn('dispatch-queue: fatal:', err);
        return {
            ...bundle,
            status: DispatchedActionsStatus.REJECTED_CLIENT,
            error: `${err}`,
        } satisfies RejectedClientAction;
    }
}
