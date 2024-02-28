using System.Collections.Generic;

class DoorDiorama : IDiorama
{
    public string GetDescription()
    {
        return "Look at a door";
    }

    public List<Dictionary<string, BaseComponentData>> GetStates()
    {
        return new()
        {
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.1f} },
                { "Door/1", new FactoryBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, model = "door-open"} },
                { "Tile/2", new TileData() { q = 1, r = -1, s = 0, height = 0.1f} },
                { "Tile/3", new TileData() { q = 0, r = -1, s = 1, height = 0.1f} },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.1f} },
                { "Door/1", new FactoryBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, model = "door-closed" } },
                { "Tile/2", new TileData() { q = 1, r = -1, s = 0, height = 0.1f} },
                { "Tile/3", new TileData() { q = 0, r = -1, s = 1, height = 0.1f} },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.1f} },
                { "Door/1", new FactoryBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, model = "door-open" } },
                { "Tile/2", new TileData() { q = 1, r = -1, s = 0, height = 0.1f} },
                { "Tile/3", new TileData() { q = 0, r = -1, s = 1, height = 0.1f} },
            },
            new()
            {

                { "Tile/1", new TileData() { q = 0, r = 0, s = 0, height = 0.1f } },
                { "Door/1", new FactoryBuildingData() { q = 0, r = 0, s = 0, height = 0.1f, model = "door-closed" } },
                { "Tile/2", new TileData() { q = 1, r = -1, s = 0, height = 0.1f } },
                { "Tile/3", new TileData() { q = 0, r = -1, s = 1, height = 0.1f } },
            },
        };
    }
}
