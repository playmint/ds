using System.Collections.Generic;
using System.Linq;
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

    HashSet<Vector3> tilePositions = new HashSet<Vector3>();

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

    public void AddTile(Vector3Int cellCubicCoords)
    {
        if (!IsTileAtPosition(cellCubicCoords))
        {
            tilePositions.Add(cellCubicCoords);

            Vector3Int gridPos = GridExtensions.CubeToGrid(cellCubicCoords);
            Vector3 worldPos = grid.CellToWorld(gridPos);
            TileController tc = EnvironmentLoaderManager.instance.AddTile(
                worldPos,
                cellCubicCoords
            );

            if (TileHelper.IsDiscoveredTile(cellCubicCoords))
                tc.AppearFull();
            else
                tc.Appear();
        }
        else if (TileHelper.IsDiscoveredTile(cellCubicCoords))
        {
            GameObject tileGO = GameObject.Find("Tile_" + cellCubicCoords.ToString());
            if (tileGO != null)
            {
                TileController tileController = tileGO.GetComponent<TileController>();
                tileController.AppearFull();
            }
        }
    }

    public bool IsTileAtPosition(Vector3Int cubicCoords)
    {
        return tilePositions.Contains(cubicCoords);
    }

    private void OnStateUpdated(Cog.GameState state)
    {
        foreach (var tile in state.World.Tiles)
        {
            // If you can think of a better way of getting incomplete buildings on a tile, I'd like to hear it...
            Cog.Buildings incompleteBuilding = state.World.Buildings.FirstOrDefault(
                b =>
                    b.Id.Contains(tile.Id.Substring(10))
                    && b.Bags.Any(n => n.Bag.Slots.Any(s => s.Balance > 0))
            );
            //... seriously that would be super useful

            var hasResource = TileHelper.HasResource(tile);
            var cellPosCube = TileHelper.GetTilePosCube(tile);

            if (hasResource)
                MapElementManager.instance.CreateBag(cellPosCube);
            else
                MapElementManager.instance.CheckBagIconRemoved(cellPosCube);

            if (TileHelper.HasEnemy(tile))
                MapElementManager.instance.CreateEnemy(cellPosCube);
            else if (TileHelper.HasBuilding(tile))
            {
                MapElementManager.instance.CreateBuilding(cellPosCube);
                MapElementManager.instance.CheckIncompleteBuildingIconRemoved(cellPosCube);
            }
            else if (incompleteBuilding != null)
                MapElementManager.instance.CreateIncompleteBuilding(cellPosCube);
            else
            {
                MapElementManager.instance.CheckBuildingIconRemoved(cellPosCube);
                MapElementManager.instance.CheckEnemyIconRemoved(cellPosCube);
                MapElementManager.instance.CheckIncompleteBuildingIconRemoved(cellPosCube);
            }

            AddTile(cellPosCube);

            // TODO: Call this again after we have refactored the map data to include the seeker list
            // IconManager.instance.CheckSeekerRemoved(state.Game.Seekers.ToList());
        }
        MapUpdated?.Invoke(state);
    }
}
