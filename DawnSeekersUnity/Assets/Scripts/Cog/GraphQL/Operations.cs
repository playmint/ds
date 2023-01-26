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

    }
}