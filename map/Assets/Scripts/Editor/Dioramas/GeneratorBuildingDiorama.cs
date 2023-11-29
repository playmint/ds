using System.Collections.Generic;

class GeneratorBuildingDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Render some factory buildings being added, highlighted, selected and removed";
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

                { "Generator/1", new GeneratorBuildingData() { q = 0, r = 0, s = 0, height = 0.1f , rotation = 0, color = "#0665F5FF", progress = 0, powered = false } },
                { "Generator/2", new GeneratorBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, rotation = 45, color = "#63B204FF", progress = 0, powered = false } },
                { "Generator/3", new GeneratorBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, rotation = 90, color = "#CA002BFF", progress = 0, powered = false } },
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

                { "Generator/1", new GeneratorBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, rotation = 0, color = "#0665F5FF", progress = 0.5f, powered = true } },
                { "Generator/2", new GeneratorBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, rotation = 45, color = "#63B204FF", progress = 0.5f, powered = true } },
                { "Generator/3", new GeneratorBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, rotation = 90, color = "#CA002BFF", progress = 0.5f, powered = true } },
            },
        };
    }
}
