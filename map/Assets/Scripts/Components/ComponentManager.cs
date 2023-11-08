using System;
using System.Linq;
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
[RequireComponent(typeof(TileHighlightManager))]
[RequireComponent(typeof(TileIconManager))]
[RequireComponent(typeof(TileGooManager))]
[RequireComponent(typeof(BagManager))]
[RequireComponent(typeof(MobileUnitManager))]
[RequireComponent(typeof(PathManager))]
[RequireComponent(typeof(FactoryBuildingManager))]
[RequireComponent(typeof(ExtractorBuildingManager))]
[RequireComponent(typeof(BlockerBuildingManager))]
[RequireComponent(typeof(LabelManager))]
[RequireComponent(typeof(IconManager))]
public class ComponentManager : MonoBehaviour
{
    [DllImport("__Internal")]
    private static extern void UnityReadyRPC();

    [DllImport("__Internal")]
    public static extern void SendEventRPC(string? eventName);

    [DllImport("__Internal")]
    public static extern void SendPositionRPC(
        string? eventName,
        float x,
        float y,
        float z,
        bool isVisible
    );

    protected async void Start()
    {
        await Ready();
#if UNITY_EDITOR
#elif UNITY_WEBGL
            UnityReadyRPC();
#endif
    }

    public async Task Ready()
    {
        if (!Application.isPlaying)
        {
            throw new Exception("Will never be ready as game is not playing");
        }
        IComponentManager[] managers = GetComponents<IComponentManager>();
        foreach (IComponentManager manager in managers)
        {
            await manager.Ready();
        }
    }

    public void SetResolution(float resolution)
    {
        Debug.Log($"ResolutionManager - SetResolution: {resolution}");
        OutlineController.renderScale = Mathf.Clamp01(resolution);
    }

    private IComponentManager GetManagerFor(ComponentMessage msg)
    {
        IComponentManager? manager =
            GetComponents<IComponentManager>()
                .Where(m =>
                {
                    return m.GetDataTypeName() == msg.type;
                })
                .FirstOrDefault()
            ?? throw new Exception($"ComponentManager: no manager found for msg type: {msg.type}");
        return manager;
    }

    public void SetComponent(string json)
    {
        try
        {
            var msg = JsonUtility.FromJson<ComponentDataMessage>(json);
            var manager = GetManagerFor(msg);
            manager.Set(msg);
        }
        catch (Exception err)
        {
            Debug.LogWarning($"ComponentManager: failed to set {json}: {err}");
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
            Debug.LogWarning($"ComponentManager: failed to remove {json}: {err}");
        }
    }
}
