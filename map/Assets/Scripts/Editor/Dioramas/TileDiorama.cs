using System.Collections.Generic;

class TileDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Render some tiles being added and removed";
    }

    public List<Dictionary<string, object>> GetStates()
    {
        return new List<Dictionary<string, object>>()
        {
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.1f } },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.2f } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0.3f } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0.2f } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0.1f } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0.2f } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0.4f } },
            },
            new()
            {
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.5f } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0.1f } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0.1f } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0.1f } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0.1f } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0.4f } },
            },
        };
    }
}
