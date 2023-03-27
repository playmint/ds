import { fromValue, map, pipe, Source, switchMap, zip } from 'wonka';
import { makeDispatcher } from './dispatcher';
import { GetSelectedPlayerDocument, SelectedPlayerFragment } from './gql/graphql';
import { Logger } from './logger';
import { CogServices, ConnectedPlayer, UnconnectedPlayer, Wallet } from './types';

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
): Source<ConnectedPlayer | UnconnectedPlayer> {
    return pipe(
        zip<any>({ client, wallet }),
        switchMap<any, ConnectedPlayer | UnconnectedPlayer>(({ client, wallet }: ClientWallet) =>
            wallet ? makeConnectedPlayerQuery(client, wallet, logger) : makeUnconnectedPlayerQuery(),
        ),
    );
}

function makeUnconnectedPlayerQuery(): Source<UnconnectedPlayer> {
    return fromValue(undefined satisfies UnconnectedPlayer);
}

function makeConnectedPlayerQuery(client: CogServices, wallet: Wallet, logger: Logger): Source<ConnectedPlayer> {
    return pipe(
        client.query(GetSelectedPlayerDocument, { gameID: client.gameID, id: wallet.id }),
        map(({ game }) => (game.state.player ? game.state.player : toFakeSelectedPlayer(wallet))),
        map(
            (selectedPlayer) =>
                ({
                    ...selectedPlayer,
                    ...makeDispatcher(client, wallet, logger),
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
        seekers: [],
    };
}
