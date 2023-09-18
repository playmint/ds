using System.Collections.Generic;

class BlockerBuildingDiorama : IDiorama
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

                { "Blocker/1", new BlockerBuildingData() { q = 0, r = 0, s = 0, height = 0.1f , model = "enemy", rotation = "0"} },
                { "Blocker/2", new BlockerBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, model = "PineTreesLarge", rotation = "45" } },
                { "Blocker/3", new BlockerBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, model = "PineTreesSmall", rotation = "90" } },
                { "Blocker/4", new BlockerBuildingData() { q = 1, r = 0, s = -1, height = 0.2f, model = "rocksLarge", rotation = "135" } },
                { "Blocker/5", new BlockerBuildingData() { q = 1, r = -1, s = 0, height = 0.1f, model = "rocksSmall", rotation = "180" } },
                { "Blocker/6", new BlockerBuildingData() { q = 0, r = -1, s = 1, height = 0.2f, model = "OakTreesLarge", rotation = "225" } },
                { "Blocker/7", new BlockerBuildingData() { q = -1, r = 0, s = 1, height = 0.4f, model = "OakTreesSmall", rotation = "270" } },
                { "Blocker/8", new BlockerBuildingData() { q = -1, r = -1, s = 2, height = 0.4f, model = "CactusLarge", rotation = "270" } },
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

                { "Blocker/1", new BlockerBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, model = "enemy", rotation = "0", selected = "highlight" } },
                { "Blocker/2", new BlockerBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, model = "PineTreesLarge", rotation = "45", selected = "highlight" } },
                { "Blocker/3", new BlockerBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, model = "PineTreesSmall", rotation = "90", selected = "highlight" } },
                { "Blocker/4", new BlockerBuildingData() { q = 1, r = 0, s = -1, height = 0.2f, model = "rocksLarge", rotation = "135", selected = "highlight" } },
                { "Blocker/5", new BlockerBuildingData() { q = 1, r = -1, s = 0, height = 0.1f, model = "rocksSmall", rotation = "180", selected = "highlight" } },
                { "Blocker/6", new BlockerBuildingData() { q = 0, r = -1, s = 1, height = 0.2f, model = "OakTreesLarge", rotation = "225", selected = "highlight" } },
                { "Blocker/7", new BlockerBuildingData() { q = -1, r = 0, s = 1, height = 0.4f, model = "OakTreesSmall", rotation = "270", selected = "highlight" } },
                { "Blocker/8", new BlockerBuildingData() { q = -1, r = -1, s = 2, height = 0.4f, model = "CactusLarge", rotation = "270", selected = "highlight" } },
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

                { "Blocker/1", new BlockerBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, model = "enemy", rotation = "0", selected = "outline" } },
                { "Blocker/2", new BlockerBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, model = "PineTreesLarge", rotation = "45", selected = "outline" } },
                { "Blocker/3", new BlockerBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, model = "PineTreesSmall", rotation = "90", selected = "outline" } },
                { "Blocker/4", new BlockerBuildingData() { q = 1, r = 0, s = -1, height = 0.2f, model = "rocksLarge", rotation = "135", selected = "outline" } },
                { "Blocker/5", new BlockerBuildingData() { q = 1, r = -1, s = 0, height = 0.1f, model = "rocksSmall", rotation = "180", selected = "outline" } },
                { "Blocker/6", new BlockerBuildingData() { q = 0, r = -1, s = 1, height = 0.2f, model = "OakTreesLarge", rotation = "225", selected = "outline" } },
                { "Blocker/7", new BlockerBuildingData() { q = -1, r = 0, s = 1, height = 0.4f, model = "OakTreesSmall", rotation = "270", selected = "outline" } },
                { "Blocker/8", new BlockerBuildingData() { q = -1, r = -1, s = 2, height = 0.4f, model = "CactusLarge", rotation = "270", selected = "outline" } },
            },
        };
    }
}
