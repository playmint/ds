using System.Collections.Generic;

class IconDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Render some blocker buildings being added, highlighted, selected and removed";
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
                { "Tile/8", new TileData() { q = -1, r = -1, s = 2, height = 0.4f } },
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
                { "Tile/8", new TileData() { q = -1, r = -1, s = 2, height = 0.4f } },

                { "Icon/1", new IconData() { q = 0, r = 0, s = 0, height = 1.1f , image = "https://assets.downstream.game/icons/xx-01.svg", backgroundColor = "#000000FF", foregroundColor = "#FFFFFFFF"} },
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
                { "Tile/8", new TileData() { q = -1, r = -1, s = 2, height = 0.4f } },

                { "Icon/1", new IconData() { q = 1, r = 0, s = -1, height = 2.1f , image = "https://assets.downstream.game/icons/xx-01.svg", backgroundColor = "#000000FF", foregroundColor = "#FFFFFFFF"} },
                { "Icon/2", new IconData() { q = 1, r = 0, s = -1, height = 1.1f, image = "https://assets.downstream.game/icons/30-66.svg", backgroundColor = "#01A6FAFF", foregroundColor = "#FBE734FF" } },
                { "Icon/3", new IconData() { q = -1, r = 0, s = 1, height = 1.1f, image = "https://assets.downstream.game/icons/30-1.svg", backgroundColor = "#FB7001FF", foregroundColor = "#FFFFFFFF" } },
            },
        };
    }
}
