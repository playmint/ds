using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Cog;
using UnityEngine;
using UnityEngine.AddressableAssets;

public class HighlightManager : MonoBehaviour
{
    public static HighlightManager instance;

    public Grid grid;

    [SerializeField]
    AssetReference highlightAsset;

    [SerializeField]
    Transform tileContainer;

    GameObject prefab;

    Dictionary<Vector3Int, HighlightController> tilePositions = new Dictionary<Vector3Int, HighlightController>();
    Dictionary<string, HighlightController> tilePositions2 = new Dictionary<string, HighlightController>();

    public Task<bool> ready;

    private void Awake()
    {
        instance = this;
        ready = LoadAssets();
    }

    private async Task<bool> LoadAssets()
    {
        var op = Addressables.LoadAssetAsync<GameObject>(highlightAsset);
        await op.Task;
        if (op.Result == null)
        {
            Debug.LogError($"HighlightManager:LoadAssetAsync failed");
            return false;
        }
        prefab = op.Result;
        /* var data = new HighlightData(); */
        /* data.id = "1"; */
        /* data.q = 1; */
        /* data.r = -1; */
        /* data.s = 0; */
        /* Set(data); */
        return true;
    }

    public void SetJSON(string json)
    {
        HighlightData data = JsonUtility.FromJson<HighlightData>(json);
        Set(data);
    }

    public void Set(HighlightData data)
    {
        Vector3Int cellCubicCoords = new Vector3Int(data.q, data.r, data.s);
        HighlightController controller;
        tilePositions2.TryGetValue(data.id, out controller);

        if (controller == null)
        {
            Vector3Int gridPos = GridExtensions.CubeToGrid(cellCubicCoords);
            Vector3 worldPos = grid.CellToWorld(gridPos);
            if (prefab == null) {
                Debug.LogError($"HighlightManager:Set attempt to instantiate before asset loaded");
                return;
            }
            var height = MapHeightManager.instance.GetHeightAtPosition(worldPos) + 0.01f;
            GameObject obj = Instantiate(prefab);
            obj.name = "Highlight_" + cellCubicCoords.ToString();
            obj.transform.position = new Vector3(worldPos.x, height, worldPos.z);
            controller = obj.GetComponent<HighlightController>();
            tilePositions2[data.id] = controller;
            tilePositions[cellCubicCoords] = controller;
        } else {
            GameObject obj = GameObject.Find("Highlight_" + cellCubicCoords.ToString());
            if (obj == null)
            {
                // something gone very wrong, this should not happen
                // remove from dict and hope for the best
                tilePositions2.Remove(data.id);
                return;
            }
            controller = obj.GetComponent<HighlightController>();
        }

        controller.data = data;
    }

    public void Remove(string id)
    {
        HighlightController controller = tilePositions2[id];
        if (controller == null)
        {
            return;
        }
        tilePositions2.Remove(id);

        HighlightData data = controller.data;
        if (data == null)
        {
            return;
        }

        Vector3Int cellCubicCoords = new Vector3Int(data.q, data.r, data.s);
        tilePositions.Remove(cellCubicCoords);

        GameObject obj = GameObject.Find("Highlight_" + cellCubicCoords.ToString());
        if (obj == null)
        {
            return;
        }
        Destroy(obj);
    }

}
