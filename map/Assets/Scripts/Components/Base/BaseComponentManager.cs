using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEngine;

interface IComponentManager
{
    public Task Ready()
    {
        return Task.Delay(0);
    }
    public void Set(ComponentDataMessage msg);
    public void Remove(ComponentMessage msg);
}

public class BaseComponentManager<Data, Controller> : MonoBehaviour, IComponentManager
where Controller : IComponentController<Data>
{

    protected GameObject? _assetPrefab;

    protected Task _ready;

    protected Dictionary<string, Controller> instances = new Dictionary<string, Controller>();

    public Task Ready()
    {
        return _ready;
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
            Transform tile = InstantiatePrefab().transform;
            controller = tile.GetComponent<Controller>();
            if (controller == null)
            {
                throw new Exception($"{GetType().Name}: failed to set: no controller found");
            }
            instances.Add(c.id, controller);
            controller.Init(c.id);
        }
        controller.Set(data);
    }

    protected GameObject InstantiatePrefab()
    {
        if (_assetPrefab == null)
        {
            throw new Exception("prefab not loaded");
        }
        return Instantiate(_assetPrefab);
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