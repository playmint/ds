using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.AddressableAssets;

interface IComponentManager
{
    public Task Ready();
}

public class TileManager : MonoBehaviour, IComponentManager
{
    [SerializeField]
    Transform container;

    [SerializeField]
    private AssetReference _assetRef;

    private GameObject _assetPrefab;

    protected Task _ready;

    Dictionary<string, TileController> tiles = new Dictionary<string, TileController>();

    protected void Awake()
    {
        _ready = LoadAssets();
    }

    public Task Ready()
    {
        return _ready;
    }

    private async Task LoadAssets()
    {
        if (_assetRef == null)
        {
            throw new ArgumentException(
                $"{GetType().Name} failed to become ready: no assetRef set"
            );
        }
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

    public void Set(ComponentDataMessage c)
    {
        var data = JsonUtility.FromJson<TileData>(c.data);
        if (c.id == null)
        {
            throw new Exception($"{GetType().Name}: failed to set: no instance id");
        }
        tiles.TryGetValue(c.id, out TileController? controller);
        if (controller == null)
        {
            Transform tile = Instantiate(_assetPrefab, container).transform;
            controller = tile.GetComponent<TileController>();
            tiles.Add(c.id, controller);
        }
        controller.Set(data);
    }

    public bool Remove(ComponentMessage c)
    {
        if (c.id == null)
        {
            throw new Exception($"{GetType().Name}: failed to set: no instance id");
        }
        tiles.TryGetValue(c.id, out TileController? controller);
        if (controller != null)
        {
            Destroy(controller.gameObject);
            tiles.Remove(c.id);
        }
        return true;
    }
}
