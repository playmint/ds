using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Tilemaps;
using Nethereum.Contracts;
using System.Linq;

public class MapManager : MonoBehaviour
{
    public static MapManager instance;
    public static bool isMakingMove;

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

    private bool _hasStateUpdated;

    private void Awake()
    {
        instance = this;
    }

    private void Start()
    {
        Cog.PluginController.Instance.EventStateUpdated += OnStateUpdated;
        if (Cog.PluginController.Instance.WorldState != null)
        {
            OnStateUpdated(Cog.PluginController.Instance.WorldState);
        }
    }

    private void Update()
    {
        // As state events occur on a separate thread, the tilemap cannot be updated as a side effect
        // of the event therefore the event will set a flag and then visual state update happens as part of the main thread
        if (_hasStateUpdated)
        {
            Debug.Log("State Update");
            RenderState(Cog.PluginController.Instance.WorldState);
            _hasStateUpdated = false;
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
        Debug.Log($"MapManager::AddTile() Adding tile type: {cell.typeID} at: {cell.cubicCoords}");
        _tilemap.SetTile(GridExtensions.CubeToGrid(cell.cubicCoords), _tileTypes[cell.typeID]);
    }

    public bool IsTileAtPosition(Vector3Int position)
    {
        return _tilemap.GetTile(GridExtensions.CubeToGrid(position)) != null;
    }

    void RenderState(Cog.GraphQL.State state)
    {
        Debug.Log("Rending new state");
        IconManager.instance.ResetSeekerPositionCounts();
        MapManager.instance.ClearMap();
        foreach (var tile in state.Tiles)
        {
            if (tile.Biome != null)
            {
                var hasResource = TileHelper.HasResource(tile);
                var cellPosCube = TileHelper.GetTilePosCube(tile);
                var cell = new MapManager.MapCell
                {
                    cubicCoords = cellPosCube,
                    typeID = 0,
                    iconID = 0,
                    cellName = ""
                };
                if (hasResource)
                    IconManager.instance.CreateBuildingIcon(cell);
                else
                    IconManager.instance.CheckIconRemoved(cell);
                MapManager.instance.AddTile(cell);
            }
        }
        var playerSeekerTilePos = new List<Vector3Int>();

        if (state.Buildings.Count == 0)
        {
            Cog.GraphQL.Building placeholderBuilding = new Cog.GraphQL.Building();
            placeholderBuilding.Location = new Cog.GraphQL.Location();
            placeholderBuilding.Location.Tile = new Cog.GraphQL.Tile();
            placeholderBuilding.Location.Tile.Coords = new List<string>()
            {
                "0x0",
                "0xffff",
                "0x06",
                "0xfffb"
            };
            state.Buildings = new List<Cog.GraphQL.Building>() { placeholderBuilding };
        }

        foreach (var building in state.Buildings)
        {
            var cellPosCube = TileHelper.GetTilePosCube(building.Location.Tile);
            var cell = new MapManager.MapCell
            {
                cubicCoords = cellPosCube,
                typeID = 0, // TODO: I presume this might have to be linked to buildings?
                iconID = 1, // TODO: I presume this might have to be linked to buildings?
                cellName = ""
            };
            IconManager.instance.CreateBuildingIcon(cell);
        }

        foreach (var seeker in state.Seekers)
        {
            // index 1 is destination location
            var cellPosCube = TileHelper.GetTilePosCube(seeker.Location[1].Tile);

            var isPlayerSeeker = (
                SeekerManager.Instance.Seeker != null
                && SeekerManager.Instance.Seeker.SeekerID == seeker.SeekerID
            );

            var cell = new MapManager.MapCell
            {
                cubicCoords = cellPosCube,
                typeID = 2,
                iconID = 0,
                cellName = "Player Seeker"
            };

            if (isPlayerSeeker)
            {
                // Render in next pass
                playerSeekerTilePos.Add(cellPosCube);
                foreach (Vector3Int neighbour in TileHelper.GetTileNeighbours(cellPosCube))
                {
                    var neighbourCell = new MapManager.MapCell
                    {
                        cubicCoords = neighbour,
                        typeID = 1,
                        iconID = 0,
                        cellName = ""
                    };
                    if (!MapManager.instance.IsTileAtPosition(neighbour))
                        MapManager.instance.AddTile(neighbourCell);
                }
            }
            else
            {
                cell.typeID = 3;
            }
            IconManager.instance.CreateSeekerIcon(
                seeker,
                cell,
                isPlayerSeeker,
                state.Seekers
                    .Where(n => TileHelper.GetTilePosCube(n.Location[1].Tile) == cellPosCube)
                    .Count()
            );
        }
        IconManager.instance.CheckSeekerRemoved(state.Seekers);
    }

    private void OnStateUpdated(Cog.GraphQL.State state)
    {
        _hasStateUpdated = true;
    }
}
