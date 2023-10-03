using System.Collections.Generic;

class PathDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Show a bouncy movement path";
    }

    public List<Dictionary<string, BaseComponentData>> GetStates()
    {
        return new()
        {
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0f } },
                { "Tile/2", new TileData() { q = 1, r = 0, s = -1, height = 0f } },
                { "Tile/3", new TileData() { q = -1, r = 0, s = 1, height = 0f } },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.2f } },
                { "Tile/2", new TileData() { q = 1, r = 0, s = -1, height = 0.4f } },
                { "Tile/3", new TileData() { q = -1, r = 0, s = 1, height = 0f } },
                { "Path/1", new PathData() { qFrom = -1, rFrom = 0, sFrom = 1, heightFrom = 0, qTo = 0, rTo = 0, sTo = 0, heightTo = 0.2f } },
                { "Path/2", new PathData() { qFrom = 0, rFrom = 0, sFrom = 0, heightFrom = 0.2f, qTo = 1, rTo = 0, sTo = -1, heightTo = 0.4f } },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.2f } },
                { "Tile/2", new TileData() { q = 1, r = 0, s = -1, height = 0.4f } },
                { "Tile/3", new TileData() { q = -1, r = 0, s = 1, height = 0f } },
                { "Path/1", new PathData() { qFrom = -1, rFrom = 0, sFrom = 1, heightFrom = 0, qTo = 0, rTo = 0, sTo = 0, heightTo = 0.2f, color = "red" } },
                { "Path/2", new PathData() { qFrom = 0, rFrom = 0, sFrom = 0, heightFrom = 0.2f, qTo = 1, rTo = 0, sTo = -1, heightTo = 0.4f, color = "red" } },
            },
        };
    }
}
