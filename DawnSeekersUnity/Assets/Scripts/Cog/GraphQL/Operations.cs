namespace Cog.GraphQL
{
    public class Operations 
    {
        private static string StateFragment = @"
        fragment stateFragment on State {
            block
            seekers: nodes(match: {kinds: [""Seeker""]}) {
                seekerID: key
                location: edges(match: {kinds: [""Tile""], via: [{rel: ""Location""}]}) {
                    key
                    time: weight
                    tile: node {
                        coords: keys
                    }
                }
            }
            tiles: nodes(match: {kinds: [""Tile""]}) {
                coords: keys
                biome: value(match: {via: [{rel: ""Biome""}]}) # 0=UNDISCOVERED, 1=DISCOVERED
            }
        }
        ";

        // ($gameID: ID!) 
        public static string FetchStateDocument = StateFragment + @"   
        query FetchState {
            game(id: ""latest"") {
                id
                state {
                    ...stateFragment
                }
            }
        }
        ";

        public static string OnStateSubscription = StateFragment + @"
        subscription OnState {
            state(gameID: ""latest"") {
                ...stateFragment
            }
        }
        ";

      public static string SigninDocument = @"
        mutation signin($gameID: ID!, $session: String!, $auth: String!) {
          signin(gameID: $gameID, session: $session, ttl: 1000, scope: ""0xffffffff"", authorization: $auth)
        }
        ";

      public static string DispatchDocument = @"
        mutation dispatch($gameID: ID!, $action: String!, $auth: String!) {
            dispatch(
                gameID: $gameID
                action: $action
                authorization: $auth
            ) {
                id
                status
            }
        }
        ";

    }
}