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
                { "Tile/2", new TileData() { q = 1, r = -1, s = 0, height = 0.1f } },
                { "Tile/3", new TileData() { q = 0, r = -1, s = 1, height = 0.1f } },
                { "Tile/4", new TileData() { q = -1, r = 0, s = 1, height = 0.4f } },

                { "Tile/5", new TileData() { q = -2, r = 1, s = 1, height = 0.4f } },
                { "Tile/6", new TileData() { q = -1, r = 1, s = 2, height = 0.4f } },

                // Movement
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

                // Highlight / outline
                { "MobileUnit/2", new MobileUnitData() { 
                    qNext = 1,
                    rNext = -1,
                    sNext = 0,
                    heightNext = 0.1f,
                    qPrev = 0,
                    rPrev = 0,
                    sPrev = 0,
                    heightPrev = 0.1f,
                    progress = 1,
                    selected = "highlight",
                    shared = false
                } },
                { "MobileUnit/3", new MobileUnitData() { 
                    qNext = 0,
                    rNext = -1,
                    sNext = 1,
                    heightNext = 0.1f,
                    qPrev = 0,
                    rPrev = 0,
                    sPrev = 0,
                    heightPrev = 0.1f,
                    progress = 1,
                    selected = "outline",
                    shared = false
                } },

                // Movement to shared tile
                { "MobileUnit/4", new MobileUnitData() { 
                    qNext = -2,
                    rNext = 1,
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
                { "MobileUnit/5", new MobileUnitData() { 
                    qNext = -1,
                    rNext = 1,
                    sNext = 2,
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
            new()
            {
                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.1f } },
                { "Tile/2", new TileData() { q = 1, r = -1, s = 0, height = 0.1f } },
                { "Tile/3", new TileData() { q = 0, r = -1, s = 1, height = 0.1f } },
                { "Tile/4", new TileData() { q = -1, r = 0, s = 1, height = 0.4f } },

                { "Tile/5", new TileData() { q = -2, r = 1, s = 1, height = 0.4f } },
                { "Tile/6", new TileData() { q = -1, r = 1, s = 2, height = 0.4f } },

                // movement
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

                // highlight and outline
                { "MobileUnit/2", new MobileUnitData() { 
                    qNext = 1,
                    rNext = -1,
                    sNext = 0,
                    heightNext = 0.1f,
                    qPrev = 0,
                    rPrev = 0,
                    sPrev = 0,
                    heightPrev = 0.1f,
                    progress = 1,
                    selected = "highlight",
                    shared = false
                } },
                { "MobileUnit/3", new MobileUnitData() { 
                    qNext = 0,
                    rNext = -1,
                    sNext = 1,
                    heightNext = 0.1f,
                    qPrev = 0,
                    rPrev = 0,
                    sPrev = 0,
                    heightPrev = 0.1f,
                    progress = 1,
                    selected = "outline",
                    shared = false
                } },

                // Movement to shared tile
                { "MobileUnit/4", new MobileUnitData() { 
                    qNext = -2,
                    rNext = 1,
                    sNext = 1,
                    heightNext = 0.4f,
                    qPrev = 0,
                    rPrev = 0,
                    sPrev = 0,
                    heightPrev = 0.1f,
                    progress = 1,
                    selected = "none",
                    shared = true
                } },
                { "MobileUnit/5", new MobileUnitData() { 
                    qNext = -2,
                    rNext = 1,
                    sNext = 1,
                    heightNext = 0.4f,
                    qPrev = 0,
                    rPrev = 0,
                    sPrev = 0,
                    heightPrev = 0.1f,
                    progress = 1,
                    selected = "none",
                    shared = true
                } },
            },
        };
    }
}
