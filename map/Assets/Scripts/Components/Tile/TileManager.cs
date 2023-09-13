using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.AddressableAssets;

public class TileManager : BaseComponentManager<TileData, TileController>, IComponentManager
{
    [SerializeField]
    Transform container;

    protected void Awake()
    {
        _ready = LoadAssets();
    }

    private async Task LoadAssets()
    {
        var op = Addressables.LoadAssetAsync<GameObject>("Assets/Addressables/Tile/Tile.prefab");
        await op.Task;
        if (op.Result == null)
        {
            throw new ArgumentException(
                $"{GetType().Name} failed to become ready: LoadAssetSync did not return asset"
            );
        }
        _assetPrefab = op.Result;
    }

    protected new GameObject InstantiatePrefab()
    {
        if (_assetPrefab == null)
        {
            throw new Exception("prefab not loaded");
        }
        return Instantiate(_assetPrefab, container);
    }

}
