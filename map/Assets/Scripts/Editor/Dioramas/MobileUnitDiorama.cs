using System.Collections.Generic;

class MobileUnitDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Render some mobile units being added and removed";
    }

    public List<Dictionary<string, BaseComponentData>> GetStates()
    {
        return new()
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
                { "MobileUnit/1", new MobileUnitData() { 
                    qNext = -1,
                    rNext = 0,
                    sNext = 1,
                    heightNext = 0.4f,
                    qPrev = 0,
                    rPrev = 0,
                    sPrev = 0,
                    heightPrev = 0.1f,
                    progress = 0,
                    selected = "none",
                    shared = false
                } },
            },
            new()
            {
                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.1f } },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.2f } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0.3f } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0.2f } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0.1f } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0.2f } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0.4f } },
                { "MobileUnit/1", new MobileUnitData() { 
                    qNext = -1,
                    rNext = 0,
                    sNext = 1,
                    heightNext = 0.4f,
                    qPrev = 0,
                    rPrev = 0,
                    sPrev = 0,
                    heightPrev = 0.1f,
                    progress = 1,
                    selected = "none",
                    shared = false
                } },
            },
        };
    }
}
