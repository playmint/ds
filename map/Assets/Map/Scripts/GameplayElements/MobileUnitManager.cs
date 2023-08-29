using Cog;
using UnityEngine;
using System.Collections.Generic;
using UnityEngine.AddressableAssets;
using System.Threading.Tasks;

public class MobileUnitManager : MonoBehaviour
{
    public static MobileUnitManager instance;

    public MobileUnit currentSelectedMobileUnit { get; private set; }
    private ICollection<MobileUnits> _playerMobileUnits;

    public Grid grid;

    [SerializeField]
    AssetReference mobileUnitAsset;
    GameObject prefab;

    Dictionary<string, MobileUnitController> tilePositions2 = new Dictionary<string, MobileUnitController>();

    public Task<bool> ready;

    private void Awake()
    {
        instance = this;
        ready = LoadAssets();
    }

    private async Task<bool> LoadAssets()
    {
        var op = Addressables.LoadAssetAsync<GameObject>(mobileUnitAsset);
        await op.Task;
        if (op.Result == null)
        {
            Debug.LogError($"MobileUnitManager:LoadAssetAsync failed");
            return false;
        }
        prefab = op.Result;
        /* var data = new MobileUnitData(); */
        /* data.id = "1"; */
        /* data.q = 1; */
        /* data.r = -1; */
        /* data.s = 0; */
        /* Set(data); */
        return true;
    }

    public void SetJSON(string json)
    {
        MobileUnitData data = JsonUtility.FromJson<MobileUnitData>(json);
        Set(data);
    }

    public void Set(MobileUnitData data)
    {
        Vector3Int cellCubicCoords = new Vector3Int(data.q, data.r, data.s);
        Vector3Int gridPos = GridExtensions.CubeToGrid(cellCubicCoords);
        Vector3 worldPos = grid.CellToWorld(gridPos);
        GameObject obj;
        MobileUnitController controller;
        tilePositions2.TryGetValue(data.id, out controller);

        if (controller == null)
        {
            if (prefab == null) {
                Debug.LogError($"HighlightManager:Set attempt to instantiate before asset loaded");
                return;
            }
            obj = Instantiate(prefab);
            obj.name = "MobileUnit_" + cellCubicCoords.ToString();
            controller = obj.GetComponent<MobileUnitController>();
            tilePositions2[data.id] = controller;
        }

        var height = MapHeightManager.instance.GetHeightAtPosition(worldPos);
        obj = controller.gameObject;
        obj.transform.position = new Vector3(worldPos.x, height, worldPos.z);
        controller.data = data;
    }

    public void Remove(string id)
    {
        MobileUnitController controller = tilePositions2[id];
        if (controller == null)
        {
            return;
        }
        tilePositions2.Remove(id);

        GameObject obj = controller.gameObject;
        if (obj == null)
        {
            return;
        }
        Destroy(obj);
    }

    /* // TODO: Still assuming only one mobileUnit */
    /* private IEnumerator OnStateUpdatedCR(GameState state) */
    /* { */
    /*     _isUpdating = true; */
    /*     int counter = 0; */
    /*     int tileChunks = Mathf.CeilToInt( */
    /*         state.World.Tiles.Count */
    /*             * (_chunkMultiplier + ((float)interruptCount * _chunkMultiplier)) */
    /*     ); */


    /*     var player = state.Player; */

    /*     //  If we've switched accounts, remove all mobileUnits to reset */
    /*     if ( */
    /*         (player != null && currentPlayer != null && currentPlayer.Id != player.Id) */
    /*         || (currentPlayer == null && player != null) */
    /*         || (currentPlayer != null && player == null) */
    /*     ) */
    /*     { */
    /*         instance.RemoveAllMobileUnits(); */
    /*         currentSelectedMobileUnit = null; */
    /*         currentPlayer = player; */
    /*     } */
    /*     if (_playerMobileUnits == null) */
    /*         yield return new WaitForSeconds(1f); // wait on first load to separate mobileUnit loading from tile loading. */

    /*     _playerMobileUnits = state.Player.MobileUnits; */

    /*     if (state.World != null) */
    /*     { */
    /*         var playerMobileUnits = new Dictionary<MobileUnits3, Vector3Int>(); */
    /*         var tileMobileUnitCount = new Dictionary<Vector3Int, int>(); */
    /*         foreach (var tile in state.World.Tiles) */
    /*         { */
    /*             var cellPosCube = TileHelper.GetTilePosCube(tile); */
    /*             // MobileUnits */
    /*             foreach (var mobileUnit in tile.MobileUnits) */
    /*             { */
    /*                 if (MobileUnitHelper.IsPlayerMobileUnit(mobileUnit)) */
    /*                 { */
    /*                     var mobileUnitPosCube = TileHelper.GetTilePosCube(mobileUnit.NextLocation); */
    /*                     MobileUnitManager.instance.CreateMobileUnit( */
    /*                         _playerMobileUnits.ToList()[0].Id, */
    /*                         mobileUnitPosCube, */
    /*                         true, */
    /*                         tile.MobileUnits.Count */
    /*                     ); */
    /*                 } */
    /*                 else */
    /*                 { */
    /*                     playerMobileUnits.Add(mobileUnit, cellPosCube); */
    /*                 } */
    /*                 counter++; */
    /*                 if (counter % tileChunks == 0) */
    /*                     yield return null; */
    /*             } */
    /*             if (tile.MobileUnits.Count > 0) */
    /*                 tileMobileUnitCount.Add(cellPosCube, tile.MobileUnits.Count); */
    /*         } */
    /*         foreach (var mobileUnit in playerMobileUnits) */
    /*         { */
    /*             if (!MobileUnitHelper.IsPlayerMobileUnit(mobileUnit.Key)) */
    /*             { */
    /*                 MobileUnitManager.instance.CreateMobileUnit( */
    /*                     mobileUnit.Key.Id, */
    /*                     mobileUnit.Value, */
    /*                     false, */
    /*                     tileMobileUnitCount[mobileUnit.Value] */
    /*                 ); */
    /*             } */
    /*         } */
    /*     } */

    /*     currentSelectedMobileUnit = state.Selected.MobileUnit; */

    /*     _isUpdating = false; */
    /*     interruptCount = 0; */
    /* } */

/*     public bool IsPlayerMobileUnit(string mobileUnitID) */
/*     { */
/*         if (_playerMobileUnits == null) */
/*         { */
/*             return false; */
/*         } */
/*         return _playerMobileUnits.Any(s => s.Id == mobileUnitID); */
/*     } */

    /* public void RemoveAllMobileUnits() */
    /* { */
    /*     var allMobileUnits = spawnedMobileUnits.ToDictionary(pair => pair.Key, pair => pair.Value); */
    /*     foreach (KeyValuePair<string, MobileUnitController> mobileUnit in allMobileUnits) */
    /*     { */
    /*         mobileUnit.Value.DestroyMapElement(); */
    /*         spawnedMobileUnits.Remove(mobileUnit.Key); */
    /*     } */
    /* } */

    /* public void RemoveMobileUnits(List<Cog.MobileUnits> mobileUnits) */
    /* { */
    /*     var filteredDictionary = spawnedMobileUnits */
    /*         .Where(pair => mobileUnits.Any(s => s.Id == pair.Key)) */
    /*         .ToDictionary(pair => pair.Key, pair => pair.Value); */
    /*     foreach (KeyValuePair<string, MobileUnitController> mobileUnit in filteredDictionary) */
    /*     { */
    /*         mobileUnit.Value.DestroyMapElement(); */
    /*         spawnedMobileUnits.Remove(mobileUnit.Key); */
    /*     } */
    /* } */

    /* public void RemoveMobileUnit(Cog.MobileUnits mobileUnit) */
    /* { */
    /*     if (spawnedMobileUnits.ContainsKey(mobileUnit.Id)) */
    /*     { */
    /*         spawnedMobileUnits[mobileUnit.Id].DestroyMapElement(); */
    /*         spawnedMobileUnits.Remove(mobileUnit.Id); */
    /*     } */
    /* } */

    /* public void CreateMobileUnit( */
    /*     string mobileUnitId, */
    /*     Vector3Int cell, */
    /*     bool isPlayer, */
    /*     int numMobileUnitsAtPos */
    /* ) */
    /* { */
    /*     IncreaseMobileUnitPositionCount(cell); */

    /*     numMobileUnitsAtPos = Mathf.Max(numMobileUnitsAtPos, mobileUnitPositionCounts[cell]); */
    /*     int buildingOnCell = MapElementManager.instance.IsElementAtCell(cell); */
    /*     int index = mobileUnitPositionCounts[cell] - 1; */

    /*     if (!spawnedMobileUnits.ContainsKey(mobileUnitId)) */
    /*     { */
    /*         MobileUnitController controller; */

    /*         if (isPlayer) */
    /*             controller = Instantiate(mobileUnitPrefab).GetComponent<MobileUnitController>(); */
    /*         else */
    /*             controller = Instantiate(mobileUnitPrefab).GetComponent<MobileUnitController>(); */

    /*         controller.Setup( */
    /*             cell, */
    /*             numMobileUnitsAtPos + buildingOnCell, */
    /*             index, */
    /*             isPlayer, */
    /*             mobileUnitId */
    /*         ); */
    /*         spawnedMobileUnits.Add(mobileUnitId, controller); */
    /*     } */
    /*     else */
    /*     { */
    /*         spawnedMobileUnits[mobileUnitId].CheckPosition( */
    /*             cell, */
    /*             numMobileUnitsAtPos + buildingOnCell, */
    /*             index, */
    /*             isPlayer */
    /*         ); */
    /*     } */
    /* } */

    /* public void IncreaseMobileUnitPositionCount(Vector3Int cell) */
    /* { */
    /*     if (!mobileUnitPositionCounts.ContainsKey(cell)) */
    /*         mobileUnitPositionCounts.Add(cell, 1); */
    /*     else */
    /*         mobileUnitPositionCounts[cell]++; */
    /* } */

    /* public MobileUnitController GetMobileUnitController() */
    /* { */
    /*     return spawnedMobileUnits[currentSelectedMobileUnit.Id]; */
    /* } */
}
