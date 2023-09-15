using System.Collections.Generic;

class TileHighlightDiorama : IDiorama
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
                { "TileHighlight/2", new TileHighlightData() { q = -1, r = 1, s = 0, height = 0.2f, style = "flat", color = "#C9DDF3FF", animation = "pulse" } },
                { "TileHighlight/3", new TileHighlightData() { q = 0, r = 1, s = -1, height = 0.3f, style = "flat", color = "#C9DDF3FF", animation = "pulse" } },
                { "TileHighlight/4", new TileHighlightData() { q = 1, r = 0, s = -1, height = 0.2f, style = "flat", color = "#C9DDF3FF", animation = "pulse" } },
                { "TileHighlight/5", new TileHighlightData() { q = 1, r = -1, s = 0, height = 0.1f, style = "flat", color = "#C9DDF3FF", animation = "pulse" } },
                { "TileHighlight/6", new TileHighlightData() { q = 0, r = -1, s = 1, height = 0.2f, style = "flat", color = "#C9DDF3FF", animation = "pulse" } },
                { "TileHighlight/7", new TileHighlightData() { q = -1, r = 0, s = 1, height = 0.4f, style = "flat", color = "#C9DDF3FF", animation = "pulse" } },
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
                { "TileHighlight/2", new TileHighlightData() { q = -1, r = 1, s = 0, height = 0.2f, style = "gradient_outline", color = "#FF2D00FF", animation = "none" } },
                { "TileHighlight/3", new TileHighlightData() { q = 0, r = 1, s = -1, height = 0.3f, style = "gradient_outline", color = "#FF2D00FF", animation = "none" } },
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
                { "TileHighlight/2", new TileHighlightData() { q = -1, r = 1, s = 0, height = 0.2f, style = "gradient_blue", color = "#FFFFFFFF", animation = "none" } },
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
                { "TileHighlight/2", new TileHighlightData() { q = 0, r = 1, s = -1, height = 0.3f, style = "gradient_blue", color = "#FFFFFFFF", animation = "none" } },
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
                { "TileHighlight/2", new TileHighlightData() { q = 0, r = 0, s = 0, height = 0.1f, style = "gradient_blue", color = "#FFFFFFFF", animation = "none" } },
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
                { "TileHighlight/2", new TileHighlightData() { q = 0, r = 0, s = 0, height = 0.1f, style = "gradient_outline", color = "#FFFFFFFF", animation = "none" } },
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
                { "TileHighlight/1", new TileHighlightData() { q = 0, r = 0, s = 0, height = 0.1f, style = "gradient_outline", color = "#FFFFFFFF", animation = "none" } },
                { "TileHighlight/2", new TileHighlightData() { q = -1, r = 1, s = 0, height = 0.2f, style = "gradient", color = "#FFFFFF40", animation = "none" } },
                { "TileHighlight/3", new TileHighlightData() { q = 0, r = 1, s = -1, height = 0.3f, style = "gradient", color = "#FFFFFF40", animation = "none" } },
                { "TileHighlight/4", new TileHighlightData() { q = 1, r = 0, s = -1, height = 0.2f, style = "gradient", color = "#FFFFFF40", animation = "none" } },
                { "TileHighlight/5", new TileHighlightData() { q = 1, r = -1, s = 0, height = 0.1f, style = "gradient", color = "#FFFFFF40", animation = "none" } },
                { "TileHighlight/6", new TileHighlightData() { q = 0, r = -1, s = 1, height = 0.2f, style = "gradient", color = "#FFFFFF40", animation = "none" } },
                { "TileHighlight/7", new TileHighlightData() { q = -1, r = 0, s = 1, height = 0.4f, style = "gradient", color = "#FFFFFF40", animation = "none" } },
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
                { "TileHighlight/1", new TileHighlightData() { q = 1, r = 0, s = -1, height = 0.2f, style = "gradient_outline", color = "#FFFFFFFF", animation = "none" } },
                { "TileHighlight/2", new TileHighlightData() { q = 0, r = 0, s = 0, height = 0.1f, style = "gradient", color = "#FFFFFF40", animation = "none" } },
                { "TileHighlight/3", new TileHighlightData() { q = 0, r = 1, s = -1, height = 0.3f, style = "gradient", color = "#FFFFFF40", animation = "none" } },
                { "TileHighlight/5", new TileHighlightData() { q = 1, r = -1, s = 0, height = 0.1f, style = "gradient", color = "#FFFFFF40", animation = "none" } },
            },
        };
    }
}
