using System.Collections.Generic;

class LightDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Render some tiles with a light source";
    }

    public List<Dictionary<string, BaseComponentData>> GetStates()
    {
        return new()
        {
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.01f, color = "#506A95"} },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0f, color = "#506A95"} },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0f, color = "#506A95"} },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0f, color = "#1980E0" } },
                { "Light/1", new LightData() { q = 0, r = 0, s = 0, height = 1f } },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.01f, color = "#506A95"} },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0f, color = "#506A95"} },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0f, color = "#506A95"} },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0f, color = "#1980E0" } },
            },
        };
    }
}
