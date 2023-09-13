using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using UnityEditor;
using UnityEngine;

[Serializable]
public class SetComponentMessage
{
    public string? id; // instance id
    public string? type; // component name eg Tile
    public string? data; // json encoded
}

[Serializable]
public class RemoveComponentMessage
{
    public string? id; // instance id
    public string? type; // component name eg Tile
}

[RequireComponent(typeof(TileManager))]
public class ComponentManager : MonoBehaviour
{
    public static ComponentManager instance;

    protected void Awake()
    {
        instance = this;
    }

    public async Task Ready()
    {
        IComponentManager[] managers = GetComponents<IComponentManager>();
        foreach (IComponentManager manager in managers)
        {
            await manager.Ready();
        }
    }

    private void OnSet(SetComponentMessage msg)
    {
        switch (msg.type)
        {
            case "Tile":
                GetComponent<TileManager>().Set(msg);
                return;
        }

    }

    public void Set(string json)
    {
        var msg = JsonUtility.FromJson<SetComponentMessage>(json);
        OnSet(msg);
    }
}
