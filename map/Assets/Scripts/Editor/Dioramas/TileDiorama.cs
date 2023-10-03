using System.Collections.Generic;

class TileDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Render some tiles being added and removed";
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
            },
            new()
            {
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, color = "#7288A6", height = 0.5f } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, color = "#7288A6", height = 0.1f } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, color = "#7288A6", height = 0.2f } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, color = "#7288A6", height = 0.3f } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, color = "#7288A6", height = 0.4f } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, color = "#FD6304", height = 0.45f } },
            },
            new()
            {
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, color = "#7288A6", height = 0.5f } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, color = "#7288A6", height = 0.1f } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, color = "#7288A6", height = 0.2f } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, color = "#7288A6", height = 0.3f } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, color = "#7288A6", height = 0.4f } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, color = "#D719E0", height = 0.2f } },
            },
        };
    }
}
