using System;
using System.Runtime.InteropServices;
using UnityEngine;
using UnityEngine.EventSystems;

public interface IComponentController<Data>
{
    public void Init(string instanceId);
    public void Set(Data data);
    public GameObject GetGameObject();
}

public class BaseComponentController<Data>
    : MonoBehaviour,
        IComponentController<Data>,
        IPointerEnterHandler,
        IPointerExitHandler,
        IPointerClickHandler
    where Data : new()
{
    protected string _dataTypeName = (new Data()).GetType().Name;
    protected string? _instanceId;
    protected Data _nextData;
    protected Data? _prevData;

    public void Init(string instanceId)
    {
        _instanceId = instanceId;
    }

    protected void Awake()
    {
        _nextData = new Data();
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
        SendEvent("pointer_enter");
    }

    public void OnPointerExit(PointerEventData evt)
    {
        SendEvent("pointer_exit");
    }

    public void OnPointerClick(PointerEventData evt)
    {
        if(!CameraController.hasDragged)
        SendEvent("pointer_click");
    }

    protected void SendEvent(string eventName)
    {
        string fullEventName = $"{_dataTypeName}_{eventName}_{_instanceId}";
#if UNITY_EDITOR
        // noop
        Debug.Log($"TriggeredEvent: {fullEventName}");
#elif UNITY_WEBGL
        ComponentManager.SendEventRPC(fullEventName);
#endif
    }
}
