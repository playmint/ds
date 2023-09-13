using System;
using System.Runtime.InteropServices;
using System.Threading.Tasks;
using UnityEngine;


[Serializable]
public class ComponentMessage
{
    public string? id; // instance id
    public string? type; // component name eg Tile
}

[Serializable]
public class ComponentDataMessage : ComponentMessage
{
    public string? data; // json encoded
}

[RequireComponent(typeof(TileManager))]
public class ComponentManager : MonoBehaviour
{
    public static ComponentManager instance;

    [DllImport("__Internal")]
    private static extern void UnityReadyRPC();

    protected void Awake()
    {
        instance = this;
    }

    protected async void Start()
    {
        Debug.Log("STARTING");
        await Ready();
        Debug.Log("READY");
#if UNITY_EDITOR
#elif UNITY_WEBGL
            UnityReadyRPC();
#endif
        Debug.Log("SENT");
    }

    public async Task Ready()
    {
        IComponentManager[] managers = GetComponents<IComponentManager>();
        foreach (IComponentManager manager in managers)
        {
            await manager.Ready();
        }
    }

    private IComponentManager? GetManagerFor(ComponentMessage msg)
    {
        switch (msg.type)
        {
            case "Tile":
                return GetComponent<TileManager>();
            default:
                return null;
        }
    }

    public void SetComponent(string json)
    {
        try
        {
            var msg = JsonUtility.FromJson<ComponentDataMessage>(json);
            var manager = GetManagerFor(msg) ?? throw new Exception("no manager found for {msg}");
            manager.Set(msg);
        }
        catch (Exception err)
        {
            Debug.Log($"ComponentManager#Set: failed to set {json}: {err}");
        }
    }

    public void RemoveComponent(string json)
    {
        try
        {
            var msg = JsonUtility.FromJson<ComponentMessage>(json);
            var manager = GetManagerFor(msg) ?? throw new Exception("no manager found for {msg}");
            manager.Remove(msg);
        }
        catch (Exception err)
        {
            Debug.Log($"ComponentManager#Remove: failed to remove {json}: {err}");
        }
    }
}
