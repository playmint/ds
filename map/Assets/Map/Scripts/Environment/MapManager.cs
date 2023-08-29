using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Cog;
using UnityEngine;
using UnityEngine.AddressableAssets;

public class MapManager : MonoBehaviour
{
    public static System.Action<Cog.GameState> MapUpdated;
    public static MapManager instance;

    public Grid grid;

    public Color scoutColor,
        normalColor;
    public MaterialPropertyBlock dynamicMatProps;
    public MaterialPropertyBlock unscoutedMatProps;
    public MaterialPropertyBlock normalMatProps;

    [SerializeField]
    AssetReference tileAsset;

    [SerializeField]
    Transform tileContainer;

    GameObject prefab;

    Dictionary<Vector3Int, TileController> tilePositions = new Dictionary<Vector3Int, TileController>();
    Dictionary<string, TileController> tilePositions2 = new Dictionary<string, TileController>();

    private int interruptCount = 0;
    private bool _isUpdating;
    private float _chunkMultiplier = 0.01f; //What percentage of tiles to handle per frame

    public Task<bool> ready;

    private void Awake()
    {
        dynamicMatProps = new MaterialPropertyBlock();
        unscoutedMatProps = new MaterialPropertyBlock();
        normalMatProps = new MaterialPropertyBlock();

        unscoutedMatProps.SetColor("_Color", scoutColor);
        normalMatProps.SetColor("_Color", normalColor);

        instance = this;
        ready = LoadAssets();
    }

    private async Task<bool> LoadAssets()
    {
        var op = Addressables.LoadAssetAsync<GameObject>(tileAsset);
        await op.Task;
        if (op.Result == null)
        {
            Debug.LogError($"TileManager:LoadAssetAsync failed");
            return false;
        }
        prefab = op.Result;
        return true;
    }

    public void SetTileJSON(string json)
    {
        TileData data = JsonUtility.FromJson<TileData>(json);
        SetTile(data);
    }

    public void SetTile(TileData data)
    {
        Vector3Int cellCubicCoords = new Vector3Int(data.q, data.r, data.s);
        TileController controller;
        tilePositions2.TryGetValue(data.id, out controller);

        if (controller == null)
        {
            Vector3Int gridPos = GridExtensions.CubeToGrid(cellCubicCoords);
            Vector3 worldPos = grid.CellToWorld(gridPos);
            if (prefab == null) {
                Debug.LogError($"TileManager:SetTile attempt to instantiate before asset loaded");
                return;
            }
            GameObject obj = Instantiate(prefab, tileContainer);
            obj.transform.name = "Tile_" + cellCubicCoords.ToString();
            obj.transform.position = new Vector3(worldPos.x, -1, worldPos.z);
            controller = obj.transform.GetComponent<TileController>();
            tilePositions2[data.id] = controller;
            tilePositions[cellCubicCoords] = controller;
        } else {
            GameObject obj = GameObject.Find("Tile_" + cellCubicCoords.ToString());
            if (obj == null)
            {
                // something gone very wrong, this should not happen
                // remove from dict and hope for the best
                tilePositions2.Remove(data.id);
                return;
            }
            controller = obj.GetComponent<TileController>();
        }

        controller.data = data;

        if (data.biome == 1)
            controller.AppearFull();
        else
            controller.Appear();
    }

    public void RemoveTile(string id)
    {
        TileController controller = tilePositions2[id];
        if (controller == null)
        {
            return;
        }
        tilePositions2.Remove(id);

        TileData data = controller.data;
        if (data == null)
        {
            return;
        }

        Vector3Int cellCubicCoords = new Vector3Int(data.q, data.r, data.s);
        if (!IsTileAtPosition(cellCubicCoords))
        {
            return;
        }
        tilePositions.Remove(cellCubicCoords);

        GameObject obj = GameObject.Find("Tile_" + cellCubicCoords.ToString());
        if (obj == null)
        {
            return;
        }
        Destroy(obj);
    }


    public TileController AddTile(Vector3Int cellCubicCoords, Tiles2 tile)
    {
        /* if (!IsTileAtPosition(cellCubicCoords)) */
        /* { */
        /*     tilePositions.Add(cellCubicCoords, tile); */

        /*     Vector3Int gridPos = GridExtensions.CubeToGrid(cellCubicCoords); */
        /*     Vector3 worldPos = grid.CellToWorld(gridPos); */
        /*     TileController tc = EnvironmentLoaderManager.instance.AddTile( */
        /*         worldPos, */
        /*         cellCubicCoords */
        /*     ); */

        /*     if (IsDiscoveredTile(cellCubicCoords)) */
        /*         tc.AppearFull(); */
        /*     else */
        /*         tc.Appear(); */

        /*     return tc; */
        /* } */
        /* else */
        /* { */
        /*     bool wasDiscoveredTile = IsDiscoveredTile(cellCubicCoords); */
        /*     tilePositions[cellCubicCoords] = tile; */

        /*     if (!IsDiscoveredTile(cellCubicCoords) && wasDiscoveredTile) */
        /*     { */
        /*         GameObject tileGO = GameObject.Find("Tile_" + cellCubicCoords.ToString()); */
        /*         if (tileGO != null) */
        /*         { */
        /*             TileController tileController = tileGO.GetComponent<TileController>(); */
        /*             tileController.Appear(); */
        /*             return tileController; */
        /*         } */
        /*     } */
        /*     else if (IsDiscoveredTile(cellCubicCoords)) */
        /*     { */
        /*         GameObject tileGO = GameObject.Find("Tile_" + cellCubicCoords.ToString()); */
        /*         if (tileGO != null) */
        /*         { */
        /*             TileController tileController = tileGO.GetComponent<TileController>(); */
        /*             tileController.AppearFull(); */
        /*             return tileController; */
        /*         } */
        /*     } */
        /* } */
        return null;
    }

    public bool IsDiscoveredTile(Vector3Int cellPosCube)
    {
        return IsTileAtPosition(cellPosCube) && tilePositions[cellPosCube].data.biome != 0;
    }

    public bool IsDecoration(Vector3Int cubePos)
    {
        /* Tiles2 tile = GetTileByPos(cubePos); */
        /* if (tile != null && tile.Building != null && GetTileByPos(cubePos).Building.Kind != null) */
        /* { */
        /*     string id = GetTileByPos(cubePos).Building.Kind.Id; */
        /*     uint category = BuildingHelper.GetBuildingCategory(id); */
        /*     if (category == 1) */
        /*     { */
        /*         return true; */
        /*     } */
        /* } */
        return false;
    }

    public TileData GetTileByPos(Vector3Int cellPosCube)
    {
        TileController tc;
        tilePositions.TryGetValue(cellPosCube, out tc);
        if (tc == null)
        {
            return null;
        }
        return tc.data;
    }

    public bool IsTileAtPosition(Vector3Int cubicCoords)
    {
        return tilePositions.ContainsKey(cubicCoords);
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

            // TODO: move to a GooManger
            if (tile.Atoms != null && tile.Atoms.Count > 0)
            {
                MapElementManager.instance.CreateGoo(tile.Atoms, cellPosCube, tileTransform);
            }

            // TODO: move to BagManager
            if (hasResource || hasReward)
            {
                MapElementManager.instance.CreateBag(cellPosCube, tileTransform, "bag" + tile.Id);
            }
            else
                MapElementManager.instance.CheckBagIconRemoved(cellPosCube);

            // TODO: move to a BuildingManager
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
