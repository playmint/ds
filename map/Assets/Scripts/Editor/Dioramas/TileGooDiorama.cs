using System.Collections.Generic;

class TileGooDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Render differing amounts of goo on tiles";
    }

    public List<Dictionary<string, BaseComponentData>> GetStates()
    {
        return new()
        {
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.01f} },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.01f } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0.01f } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0.01f } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0.01f} },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0.01f} },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0.01f } },

                { "TileGoo/2", new TileGooData() { q = -1, r = 1, s = 0, color="red", size="small", height = 0.01f } },
                { "TileGoo/3", new TileGooData() { q = 0, r = 1, s = -1, color="red", size="big", height = 0.01f } },
                { "TileGoo/4", new TileGooData() { q = 1, r = 0, s = -1, color="green", size="small", height = 0.01f } },
                { "TileGoo/5", new TileGooData() { q = 1, r = -1, s = 0, color="green", size="big", height = 0.01f} },
                { "TileGoo/6", new TileGooData() { q = 0, r = -1, s = 1, color="blue", size="small", height = 0.01f} },
                { "TileGoo/7", new TileGooData() { q = -1, r = 0, s = 1, color="blue", size="big", height = 0.01f } },
            },
        };
    }
}
