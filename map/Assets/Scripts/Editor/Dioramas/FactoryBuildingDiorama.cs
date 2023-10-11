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

                { "Factory/1", new FactoryBuildingData() { q = 0, r = 0, s = 0, height = 0.1f , model = "00-01", rotation = -30, color = "#2DAEE0", shadowColor = "#135198" } },
                { "Factory/2", new FactoryBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, model = "02-03", rotation = -30, color = "#E76CC9", shadowColor = "#A42962" } },
                { "Factory/3", new FactoryBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, model = "04-05", rotation = -30, color = "#F3964A", shadowColor = "#B9420A" } },
                { "Factory/4", new FactoryBuildingData() { q = 1, r = 0, s = -1, height = 0.2f, model = "06-07", rotation = -30, color = "#32B25A", shadowColor = "#196528" } },
                { "Factory/5", new FactoryBuildingData() { q = 1, r = -1, s = 0, height = 0.1f, model = "08-00", rotation = -30, color = "#EC5C61", shadowColor = "#9A201C" } },
                { "Factory/6", new FactoryBuildingData() { q = 0, r = -1, s = 1, height = 0.2f, model = "01-02", rotation = -30, color = "#9C74FD", shadowColor = "#6226B9" } },
                { "Factory/7", new FactoryBuildingData() { q = -1, r = 0, s = 1, height = 0.4f, model = "03-04", rotation = -30, color = "#2DAEE0", shadowColor = "#135198" } },
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

                { "Factory/1", new FactoryBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, model = "00-01", rotation = -30, selected = "highlight", color = "#2DAEE0", shadowColor = "#135198" } },
                { "Factory/2", new FactoryBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, model = "02-03", rotation = -30, selected = "highlight", color = "#E76CC9", shadowColor = "#A42962" } },
                { "Factory/3", new FactoryBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, model = "04-05", rotation = -30, selected = "highlight", color = "#F3964A", shadowColor = "#B9420A" } },
                { "Factory/4", new FactoryBuildingData() { q = 1, r = 0, s = -1, height = 0.2f, model = "06-07", rotation = -30, selected = "highlight", color = "#32B25A", shadowColor = "#196528" } },
                { "Factory/5", new FactoryBuildingData() { q = 1, r = -1, s = 0, height = 0.1f, model = "08-00", rotation = -30, selected = "highlight", color = "#EC5C61", shadowColor = "#9A201C" } },
                { "Factory/6", new FactoryBuildingData() { q = 0, r = -1, s = 1, height = 0.2f, model = "01-02", rotation = -30, selected = "highlight", color = "#9C74FD", shadowColor = "#6226B9" } },
                { "Factory/7", new FactoryBuildingData() { q = -1, r = 0, s = 1, height = 0.4f, model = "03-04", rotation = -30, selected = "highlight", color = "#2DAEE0", shadowColor = "#135198" } },
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

                { "Factory/1", new FactoryBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, model = "00-01", rotation = -30, selected = "outline", color = "#2DAEE0", shadowColor = "#135198" } },
                { "Factory/2", new FactoryBuildingData() { q = -1, r = 1, s = 0, height = 0.2f, model = "02-03", rotation = -30, selected = "outline", color = "#E76CC9", shadowColor = "#A42962" } },
                { "Factory/3", new FactoryBuildingData() { q = 0, r = 1, s = -1, height = 0.3f, model = "04-05", rotation = -30, selected = "outline", color = "#F3964A", shadowColor = "#B9420A" } },
                { "Factory/4", new FactoryBuildingData() { q = 1, r = 0, s = -1, height = 0.2f, model = "06-07", rotation = -30, selected = "outline", color = "#32B25A", shadowColor = "#196528" } },
                { "Factory/5", new FactoryBuildingData() { q = 1, r = -1, s = 0, height = 0.1f, model = "08-00", rotation = -30, selected = "outline", color = "#EC5C61", shadowColor = "#9A201C" } },
                { "Factory/6", new FactoryBuildingData() { q = 0, r = -1, s = 1, height = 0.2f, model = "01-02", rotation = -30, selected = "outline", color = "#9C74FD", shadowColor = "#6226B9" } },
                { "Factory/7", new FactoryBuildingData() { q = -1, r = 0, s = 1, height = 0.4f, model = "03-04", rotation = -30, selected = "outline", color = "#2DAEE0", shadowColor = "#135198" } },
                { "TileHighlight/2", new TileHighlightData() { q = -1, r = 1, s = 0, height = 0.2f, style = "gradient_blue", color = "#FFFFFFFF", animation = "none" } },
            },
        };
    }
}
