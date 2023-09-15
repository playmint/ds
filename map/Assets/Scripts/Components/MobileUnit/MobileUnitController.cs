using System.Runtime.InteropServices;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;

public class MobileUnitController : BaseComponentController<MobileUnitData>
{
    [SerializeField]
    protected Renderer[] outlineObjs;

    [SerializeField]
    protected Renderer[] renderers;

    [SerializeField]
    protected Color highlightColor;

    public Material redOutlineMat,
        greenOutlineMat;
    protected Color _defaultColor;

    protected void Start()
    {
        // _renderers = GetComponentsInChildren<Renderer>();
        if (renderers.Length > 0)
        {
            _defaultColor = renderers[0].material.GetColor("_EmissionColor");
        }
    }

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }

        Vector3Int cubeCoordsPrev = new Vector3Int(
            _nextData.qPrev,
            _nextData.rPrev,
            _nextData.sPrev
        );
        Vector3 worldPosPrev = CoordsHelper.CubeToWorld(cubeCoordsPrev);

        Vector3Int cubeCoordsNext = new Vector3Int(
            _nextData.qNext,
            _nextData.rNext,
            _nextData.sNext
        );
        Vector3 worldPosNext = CoordsHelper.CubeToWorld(cubeCoordsNext);

        transform.position = new Vector3(
            Mathf.Lerp(worldPosPrev.x, worldPosNext.x, _nextData.progress),
            Mathf.Lerp(_nextData.heightPrev, _nextData.heightNext, _nextData.progress),
            Mathf.Lerp(worldPosPrev.z, worldPosNext.z, _nextData.progress)
        );

        // selected
        if (_nextData.selected == "outline")
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineObj.material = redOutlineMat;
            }
            foreach (Renderer rend in renderers)
            {
                rend.material.SetColor("_EmissionColor", _defaultColor);
            }
        }
        else if (_nextData.selected == "highlight")
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineObj.material = greenOutlineMat;
            }
            foreach (Renderer rend in renderers)
            {
                rend.material.SetColor("_EmissionColor", highlightColor);
            }
        }
        else
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineObj.material = greenOutlineMat;
            }
            foreach (Renderer rend in renderers)
            {
                rend.material.SetColor("_EmissionColor", _defaultColor);
            }
        }

        _prevData = _nextData;
    }
}
