using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.EventSystems;

public interface IComponentController<Data>
{
    public void Init(string instanceId);
    public void Set(Data data);
    public GameObject GetGameObject();
}

public class BaseComponentController<Data> : MonoBehaviour, IComponentController<Data>, IPointerEnterHandler, IPointerExitHandler, IPointerClickHandler
where Data : new()
{
    protected string _dataTypeName = (new Data()).GetType().Name;
    protected string? _instanceId;
    protected Data _nextData;
    protected Data _prevData;

    public void Init(string instanceId)
    {
        _instanceId = instanceId;
    }

    protected void Awake()
    {
        _nextData = new Data();
        _prevData = _nextData;
    }

    public void Set(Data data)
    {
        _nextData = data;
    }

    public GameObject GetGameObject()
    {
        return gameObject;
    }

    public void OnPointerEnter(PointerEventData evt)
    {
        string eventName = $"{_dataTypeName}_pointer_enter_{_instanceId}";
#if UNITY_EDITOR
        // noop
#elif UNITY_WEBGL
        ComponentManager.SendEventRPC(eventName);
#endif
    }

    public void OnPointerExit(PointerEventData evt)
    {
        string eventName = $"{_dataTypeName}_pointer_exit_{_instanceId}";
#if UNITY_EDITOR
        // noop
#elif UNITY_WEBGL
        ComponentManager.SendEventRPC(eventName);
#endif
    }

    public void OnPointerClick(PointerEventData evt)
    {
        string eventName = $"{_dataTypeName}_pointer_click_{_instanceId}";
#if UNITY_EDITOR
        // noop
#elif UNITY_WEBGL
        ComponentManager.SendEventRPC(eventName);
#endif
    }
}
