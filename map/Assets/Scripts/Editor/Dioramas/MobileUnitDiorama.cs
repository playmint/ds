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
                { "Tile/7", new TileData() { q = 0, r = 1, s = 3, height = 0.4f } },

                { "Factory/2", new FactoryBuildingData() { q = 0, r = 1, s = 3, height = 0.4f, model = "02-03", rotation = -30 } },

                // Movement
                { "MobileUnit/1", new MobileUnitData() { 
                    q = 0,
                    r = 0,
                    s = 0,
                    height = 0.1f,
                    progress = 0,
                    selected = "none",
                    shared = false,
                    visible = true
                } },

                // Highlight / outline
                { "MobileUnit/2", new MobileUnitData() { 
                    q = 1,
                    r = -1,
                    s = 0,
                    height = 0.1f,
                    progress = 1,
                    selected = "highlight",
                    shared = false,
                    visible = true
                } },
                { "MobileUnit/3", new MobileUnitData() { 
                    q = 0,
                    r = -1,
                    s = 1,
                    height = 0.1f,
                    progress = 1,
                    selected = "outline",
                    shared = false,
                    visible = true
                } },

                // Movement to shared tile
                { "MobileUnit/4", new MobileUnitData() { 
                    q = -2,
                    r = 1,
                    s = 1,
                    height = 0.4f,
                    progress = 1,
                    selected = "none",
                    shared = false,
                    visible = true
                } },
                { "MobileUnit/5", new MobileUnitData() { 
                    q = -1,
                    r = 1,
                    s = 2,
                    height = 0.4f,
                    progress = 1,
                    selected = "outline",
                    shared = false,
                    visible = true
                } },
                { "MobileUnit/6", new MobileUnitData() { 
                    q = 0,
                    r = 1,
                    s = 3,
                    height = 0.4f,
                    progress = 1,
                    selected = "none",
                    shared = true,
                    visible = true
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
                { "Tile/7", new TileData() { q = 0, r = 1, s = 3, height = 0.4f } },

                { "Factory/2", new FactoryBuildingData() { q = 0, r = 1, s = 3, height = 0.4f, model = "02-03", rotation = -30 } },

                // movement
                { "MobileUnit/1", new MobileUnitData() { 
                    q = -1,
                    r = 0,
                    s = 1,
                    height = 0.4f,
                    progress = 1,
                    selected = "none",
                    shared = false,
                    visible = true
                } },

                // highlight and outline
                { "MobileUnit/2", new MobileUnitData() { 
                    q = 1,
                    r = -1,
                    s = 0,
                    height = 0.1f,
                    progress = 1,
                    selected = "highlight",
                    shared = false,
                    visible = true
                } },
                { "MobileUnit/3", new MobileUnitData() { 
                    q = 0,
                    r = -1,
                    s = 1,
                    height = 0.1f,
                    progress = 1,
                    selected = "outline",
                    shared = false,
                    visible = true
                } },

                // Movement to shared tile
                { "MobileUnit/4", new MobileUnitData() { 
                    q = -2,
                    r = 1,
                    s = 1,
                    height = 0.4f,
                    progress = 1,
                    selected = "none",
                    shared = false,
                    visible = false
                } },
                { "MobileUnit/5", new MobileUnitData() { 
                    q = -2,
                    r = 1,
                    s = 1,
                    height = 0.4f,
                    progress = 1,
                    selected = "outline",
                    shared = false,
                    visible = true
                } },
                { "MobileUnit/6", new MobileUnitData() { 
                    q = 0,
                    r = 1,
                    s = 3,
                    height = 0.4f,
                    progress = 1,
                    selected = "none",
                    shared = true,
                    visible = true
                } },
            },
        };
    }
}
