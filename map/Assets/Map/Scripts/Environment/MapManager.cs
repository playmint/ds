using System.Collections;
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

    private int interruptCount = 0;
    private bool _isUpdating;
    private float _chunkMultiplier = 0.01f; //What percentage of tiles to handle per frame

    private void Awake()
    {
#if !UNITY_EDITOR && UNITY_WEBGL
        // disable WebGLInput.captureAllKeyboardInput so elements in web page can handle keyboard inputs
        WebGLInput.captureAllKeyboardInput = false;
#endif
        dynamicMatProps = new MaterialPropertyBlock();
        unscoutedMatProps = new MaterialPropertyBlock();
        normalMatProps = new MaterialPropertyBlock();

        unscoutedMatProps.SetColor("_Color", scoutColor);
        normalMatProps.SetColor("_Color", normalColor);

        EnvironmentLoaderManager.EnvironmentAssetsLoaded += WaitForAssets;
        instance = this;
    }

    private void OnDestroy()
    {
        EnvironmentLoaderManager.EnvironmentAssetsLoaded -= WaitForAssets;
    }

    private void WaitForAssets()
    {
        Cog.GameStateMediator.Instance.EventStateUpdated += OnStateUpdated;
        if (Cog.GameStateMediator.Instance.gameState != null)
        {
            OnStateUpdated(Cog.GameStateMediator.Instance.gameState);
        }
    }

    public TileController AddTile(Vector3Int cellCubicCoords, Tiles2 tile)
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

            return tc;
        }
        else
        {
            bool wasDiscoveredTile = IsDiscoveredTile(cellCubicCoords);
            tilePositions[cellCubicCoords] = tile;

            if (!IsDiscoveredTile(cellCubicCoords) && wasDiscoveredTile)
            {
                GameObject tileGO = GameObject.Find("Tile_" + cellCubicCoords.ToString());
                if (tileGO != null)
                {
                    TileController tileController = tileGO.GetComponent<TileController>();
                    tileController.Appear();
                    return tileController;
                }
            }
            else if (IsDiscoveredTile(cellCubicCoords))
            {
                GameObject tileGO = GameObject.Find("Tile_" + cellCubicCoords.ToString());
                if (tileGO != null)
                {
                    TileController tileController = tileGO.GetComponent<TileController>();
                    tileController.AppearFull();
                    return tileController;
                }
            }
        }
        return null;
    }

    public bool IsDiscoveredTile(Vector3Int cellPosCube)
    {
        return IsTileAtPosition(cellPosCube) && tilePositions[cellPosCube].Biome != 0;
    }

    public Tiles2 GetTileByPos(Vector3Int cellPosCube)
    {
        Tiles2 t;
        tilePositions.TryGetValue(cellPosCube, out t);
        return t;
    }

    public bool IsTileAtPosition(Vector3Int cubicCoords)
    {
        return tilePositions.ContainsKey(cubicCoords);
    }

    private void OnStateUpdated(Cog.GameState state)
    {
        // If we get another state update while still updating the previous one,
        // interrupt it and increase the number of tiles processed per chunk to catch up:
        if (_isUpdating)
        {
            Debug.Log("Map Update Interrupted");
            interruptCount++;
            StopAllCoroutines();
        }
        StartCoroutine(OnStateUpdatedCR(state));
    }

    private IEnumerator OnStateUpdatedCR(Cog.GameState state)
    {
        HashSet<string> incompleteBuildings = new HashSet<string>();

        _isUpdating = true;

        int counter = 0;
        int tileChunks = Mathf.CeilToInt(
            state.World.Tiles.Count
                * (_chunkMultiplier + ((float)interruptCount * _chunkMultiplier))
        );
        foreach (var building in state.World.Buildings)
        {
            if (building.Bags.Any(n => n.Bag.Slots.Any(s => s.Balance > 0)))
            {
                incompleteBuildings.Add(building.Id.Substring(10));
            }
        }
        counter = 0;
        foreach (var tile in state.World.Tiles)
        {
            var hasResource = TileHelper.HasResource(tile);
            var cellPosCube = TileHelper.GetTilePosCube(tile);
            var hasReward = TileHelper.HasReward(tile, state.Player.MobileUnits);

            // Crudely showing atoms on the map
            Transform tileTransform = AddTile(cellPosCube, tile)?.transform;
            if (tile.Atoms != null && tile.Atoms.Count > 0)
            {
                MapElementManager.instance.CreateGoo(tile.Atoms, cellPosCube, tileTransform);
            }

            if (hasResource || hasReward)
            {
                MapElementManager.instance.CreateBag(cellPosCube, tileTransform, "bag" + tile.Id);
            }
            else
                MapElementManager.instance.CheckBagIconRemoved(cellPosCube);

            if (TileHelper.HasEnemy(tile))
                MapElementManager.instance.CreateEnemy(
                    cellPosCube,
                    tileTransform,
                    tile.Building.Id
                );
            else if (tile.Building != null)
            {
                MapElementManager.instance.CreateBuilding(
                    cellPosCube,
                    tileTransform,
                    tile.Building.Id,
                    BuildingHelper.GetBuildingCategory(tile.Building.Kind.Id),
                    tile.Building.Kind.Model.Value
                );
                MapElementManager.instance.CheckIncompleteBuildingIconRemoved(cellPosCube);
            }
            else if (incompleteBuildings.Contains(tile.Id.Substring(10)))
                MapElementManager.instance.CreateIncompleteBuilding(
                    cellPosCube,
                    tileTransform,
                    "construction" + tile.Id
                );
            else
            {
                MapElementManager.instance.CheckBuildingIconRemoved(cellPosCube);
                MapElementManager.instance.CheckEnemyIconRemoved(cellPosCube);
                MapElementManager.instance.CheckIncompleteBuildingIconRemoved(cellPosCube);
            }

            counter++;
            if (counter % tileChunks == 0)
                yield return null;
            // TODO: Call this again after we have refactored the map data to include the mobileUnit list
            // IconManager.instance.CheckMobileUnitRemoved(state.Game.MobileUnits.ToList());
        }
        MapUpdated?.Invoke(state);
        _isUpdating = false;
        interruptCount = 0;
    }
}
