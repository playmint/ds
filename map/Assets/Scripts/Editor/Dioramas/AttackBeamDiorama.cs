using System.Collections.Generic;

class AttackBeamDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Show a bouncy movement path";
    }

    public List<Dictionary<string, BaseComponentData>> GetStates()
    {
        return new()
        {
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0f, color = "#506A95" } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0f, color = "#506A95" } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0f, color = "#1980E0" } },
                { "Factory/1", new GeneratorBuildingData() { q = 0, r = 0, s = 0, height = 0.01f, rotation = -30, selected = "highlight", color = "0" } },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0f, color = "#506A95" } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0f, color = "#506A95" } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0f, color = "#1980E0" } },
                { "Factory/1", new GeneratorBuildingData() { q = 0, r = 0, s = 0, height = 0.01f, rotation = -30, selected = "highlight", color = "0" } },
                { "Path/1", new AttackBeamData() { qFrom = 0, rFrom = 0, sFrom = 0, heightFrom = 0, qTo = -1, rTo = 1, sTo = 0, heightTo = 0.01f } },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0f, color = "#506A95" } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0f, color = "#506A95" } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0f, color = "#1980E0" } },
                { "Factory/1", new GeneratorBuildingData() { q = 0, r = 0, s = 0, height = 0.01f, rotation = -30, selected = "highlight", color = "0" } },
                { "Path/2", new AttackBeamData() { qFrom = 0, rFrom = 0, sFrom = 0, heightFrom = 0, qTo = 0, rTo = 1, sTo = -1, heightTo = 0.01f } },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0f, color = "#506A95" } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0f, color = "#506A95" } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0f, color = "#1980E0" } },
                { "Factory/1", new GeneratorBuildingData() { q = 0, r = 0, s = 0, height = 0.01f, rotation = -30, selected = "highlight", color = "0" } },
                { "Path/3", new AttackBeamData() { qFrom = 0, rFrom = 0, sFrom = 0, heightFrom = 0, qTo = 1, rTo = 0, sTo = -1, heightTo = 0.01f, color = "#5555FF" } },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0f, color = "#506A95" } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0f, color = "#506A95" } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0f, color = "#1980E0" } },
                { "Factory/1", new GeneratorBuildingData() { q = 0, r = 0, s = 0, height = 0.01f, rotation = -30, selected = "highlight", color = "0" } },
                { "Path/4", new AttackBeamData() { qFrom = 0, rFrom = 0, sFrom = 0, heightFrom = 0, qTo = 1, rTo = -1, sTo = 0, heightTo = 0.01f, color = "#55FF55" } },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/2", new TileData() { q = -1, r = 1, s = 0, height = 0.01f, color = "#506A95" } },
                { "Tile/3", new TileData() { q = 0, r = 1, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/4", new TileData() { q = 1, r = 0, s = -1, height = 0f, color = "#506A95" } },
                { "Tile/5", new TileData() { q = 1, r = -1, s = 0, height = 0f, color = "#506A95" } },
                { "Tile/6", new TileData() { q = 0, r = -1, s = 1, height = 0f, color = "#506A95" } },
                { "Tile/7", new TileData() { q = -1, r = 0, s = 1, height = 0f, color = "#1980E0" } },
                { "Factory/1", new GeneratorBuildingData() { q = 0, r = 0, s = 0, height = 0.01f, rotation = -30, selected = "highlight", color = "0" } },
                { "Path/4", new AttackBeamData() { qFrom = 0, rFrom = 0, sFrom = 0, heightFrom = 0, qTo = 0, rTo = -1, sTo = 1, heightTo = 0.01f, color = "#FF5555" } },
            },
        };
    }
}
