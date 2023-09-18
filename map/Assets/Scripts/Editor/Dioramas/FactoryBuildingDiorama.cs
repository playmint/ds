using System.Collections.Generic;

class FactoryBuildingDiorama : IDiorama
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

                { "Factory/1", new FactoryBuildingData() { q = 0, r = 0, s = 0, height = 0.1f , model = "00-01", rotation = 0} },
                { "Factory/2", new FactoryBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, model = "02-03", rotation = 45 } },
                { "Factory/3", new FactoryBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, model = "04-05", rotation = 90 } },
                { "Factory/4", new FactoryBuildingData() { q = 1, r = 0, s = -1, height = 0.2f, model = "06-07", rotation = 135 } },
                { "Factory/5", new FactoryBuildingData() { q = 1, r = -1, s = 0, height = 0.1f, model = "08-00", rotation = 180 } },
                { "Factory/6", new FactoryBuildingData() { q = 0, r = -1, s = 1, height = 0.2f, model = "01-02", rotation = 225 } },
                { "Factory/7", new FactoryBuildingData() { q = -1, r = 0, s = 1, height = 0.4f, model = "03-04", rotation = 270 } },
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

                { "Factory/1", new FactoryBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, model = "00-01", rotation = 0, selected = "highlight" } },
                { "Factory/2", new FactoryBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, model = "02-03", rotation = 45, selected = "highlight" } },
                { "Factory/3", new FactoryBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, model = "04-05", rotation = 90, selected = "highlight" } },
                { "Factory/4", new FactoryBuildingData() { q = 1, r = 0, s = -1, height = 0.2f, model = "06-07", rotation = 135, selected = "highlight" } },
                { "Factory/5", new FactoryBuildingData() { q = 1, r = -1, s = 0, height = 0.1f, model = "08-00", rotation = 180, selected = "highlight" } },
                { "Factory/6", new FactoryBuildingData() { q = 0, r = -1, s = 1, height = 0.2f, model = "01-02", rotation = 225, selected = "highlight" } },
                { "Factory/7", new FactoryBuildingData() { q = -1, r = 0, s = 1, height = 0.4f, model = "03-04", rotation = 270, selected = "highlight" } },
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

                { "Factory/1", new FactoryBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, model = "00-01", rotation = 0, selected = "outline" } },
                { "Factory/2", new FactoryBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, model = "02-03", rotation = 45, selected = "outline" } },
                { "Factory/3", new FactoryBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, model = "04-05", rotation = 90, selected = "outline" } },
                { "Factory/4", new FactoryBuildingData() { q = 1, r = 0, s = -1, height = 0.2f, model = "06-07", rotation = 135, selected = "outline" } },
                { "Factory/5", new FactoryBuildingData() { q = 1, r = -1, s = 0, height = 0.1f, model = "08-00", rotation = 180, selected = "outline" } },
                { "Factory/6", new FactoryBuildingData() { q = 0, r = -1, s = 1, height = 0.2f, model = "01-02", rotation = 225, selected = "outline" } },
                { "Factory/7", new FactoryBuildingData() { q = -1, r = 0, s = 1, height = 0.4f, model = "03-04", rotation = 270, selected = "outline" } },
            },
        };
    }
}
