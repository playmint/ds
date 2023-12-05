using System.Collections.Generic;

class CritterDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Render a critter";
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

                // Movement
                { "Critter/1", new CritterData() { 
                    q = 1,
                    r = 0,
                    s = -1,
                    height = 0.6f,
                    radius = 1.2f,
                    rotation = 180,
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

                // movement
                { "Critter/1", new CritterData() { 
                    q = 0,
                    r = 0,
                    s = 0,
                    height = 0.6f,
                    radius = 1.2f,
                    rotation = 180,
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

                // movement
                { "Critter/1", new CritterData() { 
                    q = -1,
                    r = 0,
                    s = 1,
                    height = 0.6f,
                    radius = 5.2f,
                    rotation = 0,
                    visible = true
                } },
            },
        };
    }
}
