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
    where Data : BaseComponentData, new()
{
    protected string _dataTypeName = (new Data()).GetType().Name;
    protected string? _instanceId;
    protected Data _nextData;
    protected Data? _prevData;

    protected bool _isVisible;

    private Camera mainCam;

    public void Init(string instanceId)
    {
        _instanceId = instanceId;
    }

    protected void Awake()
    {
        mainCam = GameObject.Find("Main Camera").GetComponent<Camera>();
        _nextData = new Data();
    }

    protected virtual void LateUpdate()
    {
        if (!_nextData.sendScreenPosition)
            return;
        Vector3 screenPoint = mainCam.WorldToViewportPoint(
            transform.position + (Vector3.up * _nextData.screenPositionHeightOffset)
        );
        if (screenPoint.x > 0 && screenPoint.x < 1 && screenPoint.y > 0 && screenPoint.y < 1)
        {
            SendPosition("screen_position", screenPoint, true);
            _isVisible = true;
        }
        else if (_isVisible)
        {
            SendPosition("screen_position", screenPoint, false);
            _isVisible = false;
        }
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
        if (!CameraController.hasDragged)
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

    protected void SendPosition(string eventName, Vector3 position, bool isVisible)
    {
        string fullEventName = $"{_dataTypeName}_{eventName}_{_instanceId}";
#if UNITY_EDITOR
        // noop
        Debug.Log($"TriggeredEvent: {fullEventName}, position: {position}, isVisible: {isVisible}");
#elif UNITY_WEBGL
        ComponentManager.SendPositionRPC(fullEventName, position.x, position.y, position.z, isVisible);
#endif
    }
}
