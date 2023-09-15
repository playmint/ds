using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;
using UnityEngine.AddressableAssets;

interface IComponentManager
{
    public Task Ready()
    {
        return Task.Delay(0);
    }
    public void Set(ComponentDataMessage msg);
    public void Remove(ComponentMessage msg);
    public string GetDataTypeName();
}

public class BaseComponentManager<Data, Controller> : MonoBehaviour, IComponentManager
where Controller : IComponentController<Data>
where Data : new()
{

    [SerializeField]
    protected AssetReference _assetRef;

    protected GameObject? _assetPrefab;

    protected Task _ready;

    protected Dictionary<string, Controller> instances = new Dictionary<string, Controller>();

    protected string _dataTypeName = (new Data()).GetType().Name;

    protected void Awake()
    {
        _ready = LoadAssets();
    }

    private async Task LoadAssets()
    {
        if (_assetRef == null || !_assetRef.RuntimeKeyIsValid())
        {
            return;
        }
        var op = Addressables.LoadAssetAsync<GameObject>(_assetRef);
        await op.Task;
        if (op.Result == null)
        {
            throw new ArgumentException(
                $"{GetType().Name} failed to become ready: LoadAssetSync did not return asset"
            );
        }
        _assetPrefab = op.Result;
    }

    protected GameObject InstantiatePrefab()
    {
        if (_assetPrefab == null)
        {
            throw new Exception("prefab not loaded");
        }
        return Instantiate(_assetPrefab);
    }

    public Task Ready()
    {
        return _ready;
    }

    public string GetDataTypeName()
    {
        return _dataTypeName;
    }

    public void Set(ComponentDataMessage c)
    {
        var data = JsonUtility.FromJson<Data>(c.data);
        if (c.id == null)
        {
            throw new Exception($"{GetType().Name}: failed to set: no instance id");
        }
        instances.TryGetValue(c.id, out Controller? controller);
        if (controller == null)
        {
            GameObject instance = InstantiatePrefab();
            controller = instance.GetComponent<Controller>();
            if (controller == null)
            {
                throw new Exception($"{GetType().Name}: failed to set: no controller found");
            }
            instances.Add(c.id, controller);
            controller.Init(c.id);
        }
        controller.Set(data);
    }

    public void Remove(ComponentMessage c)
    {
        if (c.id == null)
        {
            throw new Exception($"{GetType().Name}: failed to set: no instance id");
        }
        instances.TryGetValue(c.id, out Controller? controller);
        if (controller != null)
        {
            Destroy(controller.GetGameObject());
            instances.Remove(c.id);
        }
    }
}