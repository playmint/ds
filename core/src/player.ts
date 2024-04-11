import { concat, debounce, fromValue, lazy, map, pipe, share, Source, switchMap, tap, zip } from 'wonka';
import { makeDispatcher } from './dispatcher';
import { GetSelectedPlayerDocument, SelectedPlayerFragment } from './gql/graphql';
import { Logger } from './logger';
import { CogServices, ConnectedPlayer, UnconnectedPlayer, Wallet } from './types';
import { NodeSelectors } from './helpers';
import { solidityPacked, solidityPackedKeccak256 } from 'ethers';

interface ClientWallet {
    client: CogServices;
    wallet: Wallet;
}

/**
 * makeConnectedPlayer watches a wallet source and returns the selected player
 * data along with a dispatch function + queue for the player to issue actions.
 *
 */
export function makeConnectedPlayer(
    client: Source<CogServices>,
    wallet: Source<Wallet | undefined>,
    logger: Logger,
    zone: number,
): Source<ConnectedPlayer | UnconnectedPlayer> {
    let prev: ConnectedPlayer | UnconnectedPlayer;
    const source = pipe(
        zip<any>({ client, wallet }),
        switchMap<any, ConnectedPlayer | UnconnectedPlayer>(({ client, wallet }: ClientWallet) =>
            wallet ? makeConnectedPlayerQuery(client, wallet, logger, zone) : makeUnconnectedPlayerQuery(),
        ),
        tap((next) => (prev = next)),
        share,
    );
    return pipe(
        lazy(() => (prev ? concat([fromValue(prev), source]) : source)),
        debounce(() => 10),
    );
}

function makeUnconnectedPlayerQuery(): Source<UnconnectedPlayer> {
    return fromValue(undefined satisfies UnconnectedPlayer);
}

export const encodeZonedPlayerID = ({ zone, address }: { zone: number; address: string }) => {
    const id = BigInt.asUintN(64, BigInt(solidityPackedKeccak256(['int16', 'address'], [zone, address])));
    return solidityPacked(['bytes4', 'uint96', 'uint64'], [NodeSelectors.ZonedPlayer, 0, id]);
};

function makeConnectedPlayerQuery(
    client: CogServices,
    wallet: Wallet,
    logger: Logger,
    zone: number,
): Source<ConnectedPlayer> {
    const dispatcher = makeDispatcher(client, wallet, logger);
    const zonedPlayerID = encodeZonedPlayerID({ zone, address: wallet.address });
    return pipe(
        client.query(GetSelectedPlayerDocument, { gameID: client.gameID, id: wallet.id, zonedPlayerID }),
        map(({ game }) => (game.state.player ? game.state.player : toFakeSelectedPlayer(wallet))),
        map(
            (selectedPlayer) =>
                ({
                    ...selectedPlayer,
                    ...dispatcher,
                } satisfies ConnectedPlayer),
        ),
    );
}

/**
 * toFakeSelectedPlayer builds a Player object from a wallet address.
 *
 * we can do this because the player id is make up from the player wallet address
 *
 */
function toFakeSelectedPlayer(wallet: Wallet): SelectedPlayerFragment {
    return {
        id: wallet.id,
        addr: wallet.address,
        zone: null,
        tokens: [],
    };
}
