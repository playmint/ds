using System.Collections.Generic;

class BagDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Place a bag in a corner of a tile";
    }

    public List<Dictionary<string, BaseComponentData>> GetStates()
    {
        return new()
        {
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.1f} },
                { "Bag/1", new BagData() { q = 0, r = 0, s = 0, height = 0.1f, corner = 0} },
                { "Tile/2", new TileData() { q = 1, r = -1, s = 0, height = 0.1f} },
                { "Bag/2", new BagData() { q = 1, r = -1, s = 0, height = 0.1f, corner = 1, selected = "outline"} },
                { "Tile/3", new TileData() { q = 0, r = -1, s = 1, height = 0.1f} },
                { "Bag/3", new BagData() { q = 0, r = -1, s = 1, height = 0.1f, corner = 1, selected = "highlight"} },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.1f} },
                { "Bag/1", new BagData() { q = 0, r = 0, s = 0, height = 0.1f, corner = 1} },
                { "Tile/2", new TileData() { q = 1, r = -1, s = 0, height = 0.1f} },
                { "Bag/2", new BagData() { q = 1, r = -1, s = 0, height = 0.1f, corner = 1, selected = "outline"} },
                { "Tile/3", new TileData() { q = 0, r = -1, s = 1, height = 0.1f} },
                { "Bag/3", new BagData() { q = 0, r = -1, s = 1, height = 0.1f, corner = 1, selected = "highlight"} },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.1f} },
                { "Bag/1", new BagData() { q = 0, r = 0, s = 0, height = 0.1f, corner = 0} },
                { "Tile/2", new TileData() { q = 1, r = -1, s = 0, height = 0.1f} },
                { "Bag/2", new BagData() { q = 1, r = -1, s = 0, height = 0.1f, corner = 1, selected = "none"} },
                { "Tile/3", new TileData() { q = 0, r = -1, s = 1, height = 0.1f} },
                { "Bag/3", new BagData() { q = 0, r = -1, s = 1, height = 0.1f, corner = 1, selected = "none"} },
            },
        };
    }
}
