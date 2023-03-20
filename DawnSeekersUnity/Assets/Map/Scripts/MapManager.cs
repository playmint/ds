using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Tilemaps;
using System;
using System.Linq;

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
        Cog.PluginController.Instance.EventStateUpdated += OnStateUpdated;
        if (Cog.PluginController.Instance.WorldState != null)
        {
            OnStateUpdated(Cog.PluginController.Instance.WorldState);
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

    void RenderState(Cog.State state)
    {
        // Debug.Log("MapManager::RenderState()");
        IconManager.instance.ResetSeekerPositionCounts();
        MapManager.instance.ClearMap();
        foreach (var tile in state.Game.Tiles)
        {
            if (tile.Biome != 0)
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

        // foreach (var building in state.Game.Buildings)
        // {
        //     var cellPosCube = TileHelper.GetTilePosCube(building.Location.Tile);
        //     var cell = new MapManager.MapCell
        //     {
        //         cubicCoords = cellPosCube,
        //         typeID = 0, // TODO: I presume this might have to be linked to buildings?
        //         iconID = 1, // TODO: I presume this might have to be linked to buildings?
        //         cellName = ""
        //     };
        //     IconManager.instance.CreateBuildingIcon(cell);
        // }

        foreach (var seeker in state.Game.Seekers)
        {
            // index 1 is destination location
            var cellPosCube = TileHelper.GetTilePosCube(seeker.Location.Next.Tile);

            var isPlayerSeeker = (
                SeekerManager.Instance.Seeker != null
                && SeekerManager.Instance.Seeker.Id == seeker.Id
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
                state.Game.Seekers
                    .Where(
                        n =>
                            n.Location.Next.Tile != null
                            && TileHelper.GetTilePosCube(n.Location.Next.Tile) == cellPosCube
                    )
                    .Count()
            );
        }
        IconManager.instance.CheckSeekerRemoved(state.Game.Seekers.ToList());
    }

    private void OnStateUpdated(Cog.State state)
    {
        RenderState(Cog.PluginController.Instance.WorldState);
    }
}
