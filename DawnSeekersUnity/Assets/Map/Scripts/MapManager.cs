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

    public void AddTile(MapCell cell)
    {
        // Debug.Log($"MapManager::AddTile() Adding tile type: {cell.typeID} at: {cell.cubicCoords}");
        _tilemap.SetTile(GridExtensions.CubeToGrid(cell.cubicCoords), _tileTypes[cell.typeID]);
    }

    public bool IsTileAtPosition(Vector3Int position)
    {
        return _tilemap.GetTile(GridExtensions.CubeToGrid(position)) != null;
    }

    private void OnStateUpdated(Cog.GameState state)
    {
        // Debug.Log("MapManager::RenderState()");
        IconManager.instance.ResetSeekerPositionCounts();
        MapManager.instance.ClearMap();
        foreach (var tile in state.World.Tiles)
        {
            if (tile.Biome != 0)
            {
                var hasResource = TileHelper.HasResource(tile);
                var cellPosCube = TileHelper.GetTilePosCube(tile);
                var cell = new MapManager.MapCell
                {
                    cubicCoords = cellPosCube,
                    typeID = 0, // TODO: Ask Jack if these are used anymore
                    iconID = 0, // TODO: Ask Jack if these are used anymore
                    cellName = ""
                };
                if (hasResource)
                    IconManager.instance.CreateBuildingIcon(cell);
                else
                    IconManager.instance.CheckIconRemoved(cell);

                if (tile.Building != null)
                    IconManager.instance.CreateBuildingIcon(cell);

                MapManager.instance.AddTile(cell);

                // Seekers
                foreach (var seeker in tile.Seekers)
                {
                    // Don't render any of the player's seekers as the SeekerManager handles that from the player data
                    if (!SeekerHelper.IsPlayerSeeker(seeker))
                    {
                        IconManager.instance.CreateSeekerIcon(
                            seeker,
                            cell,
                            false,
                            tile.Seekers.Count
                        );
                    }
                }
                // Do I need to call this?
                // IconManager.instance.CheckSeekerRemoved(state.Game.Seekers.ToList());
            }
        }
        var playerSeekerTilePos = new List<Vector3Int>();
    }
}
