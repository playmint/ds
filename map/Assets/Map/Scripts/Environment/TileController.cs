using System;
using System.Collections;
using UnityEngine;
using UnityEngine.EventSystems;
using System.Runtime.InteropServices;

[Serializable]
public class TileData
{
    public string id;
    public int biome;
    public int q;
    public int r;
    public int s;
}

public class TileController : MonoBehaviour, IPointerEnterHandler, IPointerExitHandler, IPointerClickHandler
{
    [SerializeField]
    AnimationCurve popInCurve;

    [SerializeField]
    Renderer rend;

    public TileData data;

    [DllImport("__Internal")]
    private static extern void SendEventRPC(string eventName);

    private float delay;

    bool hasRisen = false;


    public void AppearFull()
    {
        if (hasRisen)
            return;
        hasRisen = true;
        delay = Mathf.Clamp(Camera.main.WorldToViewportPoint(transform.position).x, 0, 1);
        StartCoroutine(AppearFullCR());
    }

    IEnumerator AppearFullCR()
    {
        float t = 0;
        Vector3 startPos = transform.position;
        Vector3 endPos = new Vector3(
            transform.position.x,
            MapHeightManager.instance.GetHeightAtPosition(transform.position),
            transform.position.z
        );
        yield return new WaitForSeconds(delay);
        while (t < 1)
        {
            t += Time.deltaTime * 3;
            transform.position = Vector3.LerpUnclamped(startPos, endPos, popInCurve.Evaluate(t));
            MapManager.instance.dynamicMatProps.SetColor(
                "_Color",
                Color.Lerp(
                    MapManager.instance.scoutColor,
                    MapManager.instance.normalColor,
                    popInCurve.Evaluate(t)
                )
            );
            rend.SetPropertyBlock(MapManager.instance.dynamicMatProps);
            yield return null;
        }

        rend.SetPropertyBlock(MapManager.instance.normalMatProps);
    }

    public void Appear()
    {
        hasRisen = false;
        transform.position = new Vector3(transform.position.x, transform.position.y, transform.position.z);
        delay = Mathf.Clamp(Camera.main.WorldToViewportPoint(transform.position).x, 0, 1);
        rend.SetPropertyBlock(MapManager.instance.unscoutedMatProps);
        StartCoroutine(AppearCR());
    }

    IEnumerator AppearCR()
    {
        float t = 0;
        Vector3 startPos = new Vector3(transform.position.x, transform.position.y, transform.position.z);
        Vector3 endPos = new Vector3(
            transform.position.x,
            MapHeightManager.instance.GetHeightAtPosition(transform.position),
            transform.position.z
        );
        yield return new WaitForSeconds(delay);

        while (t < 1)
        {
            t += Time.deltaTime * 5;
            transform.position = Vector3.LerpUnclamped(startPos, endPos, popInCurve.Evaluate(t));
            yield return null;
        }
    }

    public void OnPointerEnter(PointerEventData evt)
    {
        Vector3Int gridPos = MapManager.instance.grid.WorldToCell(transform.position);
        Vector3 cellCubicCoords = GridExtensions.GridToCube(gridPos);
        string eventName = $"tile_pointer_enter_{cellCubicCoords.x}_{cellCubicCoords.y}_{cellCubicCoords.z}";
#if UNITY_EDITOR
        // noop
#elif UNITY_WEBGL
        SendEventRPC(eventName);
#endif
    }

    public void OnPointerExit(PointerEventData evt)
    {
        Vector3Int gridPos = MapManager.instance.grid.WorldToCell(transform.position);
        Vector3 cellCubicCoords = GridExtensions.GridToCube(gridPos);
        string eventName = $"tile_pointer_exit_{cellCubicCoords.x}_{cellCubicCoords.y}_{cellCubicCoords.z}";
#if UNITY_EDITOR
        // noop
#elif UNITY_WEBGL
        SendEventRPC(eventName);
#endif
    }

    public void OnPointerClick(PointerEventData evt)
    {
        Vector3Int gridPos = MapManager.instance.grid.WorldToCell(transform.position);
        Vector3 cellCubicCoords = GridExtensions.GridToCube(gridPos);
        string eventName = $"tile_pointer_click_{cellCubicCoords.x}_{cellCubicCoords.y}_{cellCubicCoords.z}";
#if UNITY_EDITOR
        // noop
#elif UNITY_WEBGL
        SendEventRPC(eventName);
#endif
    }
}
