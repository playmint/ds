using System.Collections.Generic;
using UnityEngine;

public interface IDiorama
{
    public string GetDescription();
    public List<Dictionary<string, object>> GetStates();
}

class TileDiorama : IDiorama
{
    public string GetDescription()
    {
        return "render some tiles";
    }

    public List<Dictionary<string, object>> GetStates()
    {
        return new List<Dictionary<string, object>>()
        {
            // everything that should be visible at step 0
            new()
            {

                { "Tile/1", new TileData() { id = "0x1", q = 0, r = 0, s = 0, height = 0.2f } },
                { "Tile/2", new TileData() { id = "0x2", q = 1, r = -1, s = 0, height = 0.2f } },
                { "Tile/3", new TileData() { id = "0x3", q = -1, r = 1, s = 0, height = 0.2f } },
                { "Tile/4", new TileData() { id = "0x4", q = 1, r = 0, s = -1, height = 0.2f } },
                { "Tile/5", new TileData() { id = "0x5", q = -1, r = 0, s = 1, height = 0.2f } },
            },
            // everything that should be visible at step 1
            new()
            {
                { "Tile/2", new TileData() { id = "0x2", q = 1, r = -1, s = 0, height = 0.5f } },
                { "Tile/3", new TileData() { id = "0x3", q = -1, r = 1, s = 0, height = 0.4f } },
            }
        };
    }
}
