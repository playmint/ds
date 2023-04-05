using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Tilemaps;

public class MapManager : MonoBehaviour
{
    public static MapManager instance;

    //public static bool isMakingMove;

    public struct MapCell
    {
        public Vector3Int cubicCoords;
        public int typeID;
        public int iconID;
        public string cellName;
    }

    public Grid grid;

    [SerializeField]
    private Tilemap _tilemap;

    [SerializeField]
    private Tile[] _tileTypes;

    private void Awake()
    {
        instance = this;
    }

    private void Start()
    {
        Cog.GameStateMediator.Instance.EventStateUpdated += OnStateUpdated;
        if (Cog.GameStateMediator.Instance.gameState != null)
        {
            OnStateUpdated(Cog.GameStateMediator.Instance.gameState);
        }
    }

    public void ClearMap()
    {
        _tilemap.ClearAllTiles();
    }

    public void UpdateMap()
    {
        _tilemap.RefreshAllTiles();
    }

    public async void AddTile(MapCell cell)
    {
        if (!IsTileAtPosition(cell.cubicCoords))
        {
            await EnvironmentLoaderManager.instance.AddTile(grid.CellToWorld(GridExtensions.CubeToGrid(cell.cubicCoords)));
            // Debug.Log($"MapManager::AddTile() Adding tile type: {cell.typeID} at: {cell.cubicCoords}");
            _tilemap.SetTile(GridExtensions.CubeToGrid(cell.cubicCoords), _tileTypes[cell.typeID]);
        }
    }

    public bool IsTileAtPosition(Vector3Int position)
    {
        return _tilemap.GetTile(GridExtensions.CubeToGrid(position)) != null;
    }

    private void OnStateUpdated(Cog.GameState state)
    {
        // Debug.Log("MapManager::RenderState()");
        IconManager.instance.ResetSeekerPositionCounts();
        //MapManager.instance.ClearMap();
        foreach (var tile in state.World.Tiles)
        {
            var hasResource = TileHelper.HasResource(tile);
            var cellPosCube = TileHelper.GetTilePosCube(tile);
            var cell = new MapManager.MapCell
            {
                cubicCoords = cellPosCube,
                typeID = tile.Biome == 1 ? TileType.STANDARD : TileType.SCOUT,
                iconID = GetIconID(tile), // NOTE: This and the icon code below is a bit confusing, I think we need to tidy up
                cellName = ""
            };

            if (hasResource)
                IconManager.instance.CreateBagIcon(cell);
            else
                IconManager.instance.CheckBagIconRemoved(cell);

            if (TileHelper.HasBuilding(tile))
                IconManager.instance.CreateBuildingIcon(cell);
            else
                IconManager.instance.CheckBuildingIconRemoved(cell);

            MapManager.instance.AddTile(cell);

            // Seekers
            foreach (var seeker in tile.Seekers)
            {
                // Don't render any of the player's seekers as the SeekerManager handles that from the player data
                if (!SeekerHelper.IsPlayerSeeker(seeker))
                {
                    IconManager.instance.CreateSeekerIcon(seeker, cell, false, tile.Seekers.Count);
                }
            }
            // TODO: Call this again after we have refactored the map data to include the seeker list
            // IconManager.instance.CheckSeekerRemoved(state.Game.Seekers.ToList());
        }
        var playerSeekerTilePos = new List<Vector3Int>();
    }

    // This is all a bit weird
    private int GetIconID(Cog.Tiles2 tile)
    {
        if (TileHelper.HasResource(tile))
        {
            return 0;
        }

        if (TileHelper.HasBuilding(tile))
        {
            return 1;
        }

        return 0;
    }
}
