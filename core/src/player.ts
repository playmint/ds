import { filter, fromValue, map, pipe, Source, switchMap } from 'wonka';
import { makeDispatcher } from './dispatcher';
import { GetSelectedPlayerDocument, GetSelectedPlayerQuery, SelectedPlayerFragment } from './gql/graphql';
import { Logger } from './logger';
import { CogServices, ConnectedPlayer, Wallet } from './types';

/**
 * makeConnectedPlayer watches a wallet source and returns the selected player
 * data along with a dispatch function + queue for the player to issue actions.
 *
 */
export function makeConnectedPlayer(
    client: Source<CogServices>,
    wallet: Source<Wallet | undefined>,
    logger: Logger,
): Source<ConnectedPlayer | undefined> {
    return pipe(
        client,
        switchMap((client) =>
            pipe(
                wallet,
                switchMap((wallet) =>
                    wallet
                        ? pipe(
                              client.query(GetSelectedPlayerDocument, { gameID: client.gameID, id: wallet.id }),
                              map((res) => res.data),
                              filter((data): data is GetSelectedPlayerQuery => !!data),
                              map(({ game }) => (game.state.player ? game.state.player : toFakeSelectedPlayer(wallet))),
                              map(
                                  (selectedPlayer) =>
                                      ({
                                          ...selectedPlayer,
                                          ...makeDispatcher(client, wallet, logger),
                                      } satisfies ConnectedPlayer),
                              ),
                          )
                        : fromValue(undefined),
                ),
            ),
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
