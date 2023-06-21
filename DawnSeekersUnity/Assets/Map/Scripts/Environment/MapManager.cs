using System.Collections.Generic;
using System.Linq;
using Cog;
using UnityEngine;
using UnityEngine.Tilemaps;

public class MapManager : MonoBehaviour
{
    public static System.Action<Cog.GameState> MapUpdated;
    public static MapManager instance;

    public struct MapCell
    {
        public Vector3Int cubicCoords;
        public int typeID;
        public int iconID;
        public string cellName;
    }

    public Grid grid;

    public Color scoutColor,
        normalColor;
    public MaterialPropertyBlock dynamicMatProps;
    public MaterialPropertyBlock unscoutedMatProps;
    public MaterialPropertyBlock normalMatProps;

    Dictionary<Vector3Int, Tiles2> tilePositions = new Dictionary<Vector3Int, Tiles2>();

    private void Awake()
    {
        dynamicMatProps = new MaterialPropertyBlock();
        unscoutedMatProps = new MaterialPropertyBlock();
        normalMatProps = new MaterialPropertyBlock();

        unscoutedMatProps.SetColor("_Color", scoutColor);
        normalMatProps.SetColor("_Color", normalColor);

        EnvironmentLoaderManager.EnvironmentAssetsLoaded += WaitForAssets;
        instance = this;
    }

    private void WaitForAssets()
    {
        Cog.GameStateMediator.Instance.EventStateUpdated += OnStateUpdated;
        if (Cog.GameStateMediator.Instance.gameState != null)
        {
            OnStateUpdated(Cog.GameStateMediator.Instance.gameState);
        }
    }

    public void AddTile(Vector3Int cellCubicCoords, Tiles2 tile)
    {
        if (!IsTileAtPosition(cellCubicCoords))
        {
            tilePositions.Add(cellCubicCoords, tile);

            Vector3Int gridPos = GridExtensions.CubeToGrid(cellCubicCoords);
            Vector3 worldPos = grid.CellToWorld(gridPos);
            TileController tc = EnvironmentLoaderManager.instance.AddTile(
                worldPos,
                cellCubicCoords
            );

            if (IsDiscoveredTile(cellCubicCoords))
                tc.AppearFull();
            else
                tc.Appear();
        }
        else
        {
            tilePositions[cellCubicCoords] = tile;
            if (IsDiscoveredTile(cellCubicCoords))
            {
                GameObject tileGO = GameObject.Find("Tile_" + cellCubicCoords.ToString());
                if (tileGO != null)
                {
                    TileController tileController = tileGO.GetComponent<TileController>();
                    tileController.AppearFull();
                }
            }
        }
    }

    public bool IsDiscoveredTile(Vector3Int cellPosCube)
    {
        return IsTileAtPosition(cellPosCube) && tilePositions[cellPosCube].Biome != 0;
    }

    public Tiles2 GetTileByPos(Vector3Int cellPosCube)
    {
        return tilePositions[cellPosCube];
    }

    public bool IsTileAtPosition(Vector3Int cubicCoords)
    {
        return tilePositions.ContainsKey(cubicCoords);
    }

    private void OnStateUpdated(Cog.GameState state)
    {
        HashSet<string> incompleteBuildings = new HashSet<string>();
        foreach (var building in state.World.Buildings)
        {
            if (building.Bags.Any(n => n.Bag.Slots.Any(s => s.Balance > 0)))
            {
                incompleteBuildings.Add(building.Id.Substring(10));
            }
        }

        foreach (var tile in state.World.Tiles)
        {
            var hasResource = TileHelper.HasResource(tile);
            var cellPosCube = TileHelper.GetTilePosCube(tile);

            if (hasResource)
                MapElementManager.instance.CreateBag(cellPosCube);
            else
                MapElementManager.instance.CheckBagIconRemoved(cellPosCube);

            if (TileHelper.HasEnemy(tile))
                MapElementManager.instance.CreateEnemy(cellPosCube);
            else if (tile.Building != null)
            {
                MapElementManager.instance.CreateBuilding(cellPosCube);
                MapElementManager.instance.CheckIncompleteBuildingIconRemoved(cellPosCube);
            }
            else if (incompleteBuildings.Contains(tile.Id.Substring(10)))
                MapElementManager.instance.CreateIncompleteBuilding(cellPosCube);
            else
            {
                MapElementManager.instance.CheckBuildingIconRemoved(cellPosCube);
                MapElementManager.instance.CheckEnemyIconRemoved(cellPosCube);
                MapElementManager.instance.CheckIncompleteBuildingIconRemoved(cellPosCube);
            }

            AddTile(cellPosCube, tile);

            // TODO: Call this again after we have refactored the map data to include the seeker list
            // IconManager.instance.CheckSeekerRemoved(state.Game.Seekers.ToList());
        }
        MapUpdated?.Invoke(state);
    }
}
