using System.Runtime.InteropServices;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;
using ColorUtility = UnityEngine.ColorUtility;

public class TileController : BaseComponentController<TileData>
{
    [SerializeField]
    Renderer rend;

    [SerializeField]
    AnimationCurve popInCurve;

    private MaterialPropertyBlock _dynamicMatProps;
    private float _t;
    private string _defaultMatColor = "#7288A6";

    protected void Start()
    {
        _dynamicMatProps = new MaterialPropertyBlock();
    }

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }

        Vector3Int targetCubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 targetWorldPos = CoordsHelper.CubeToWorld(targetCubeCoords);
        targetWorldPos.y = _nextData.height;

        _t += Time.deltaTime / 3;

        // transition height
        transform.position = new Vector3(
            targetWorldPos.x,
            Mathf.LerpUnclamped(transform.position.y, targetWorldPos.y, popInCurve.Evaluate(_t)),
            targetWorldPos.z
        );

        // transition color
        ColorUtility.TryParseHtmlString(
            _nextData.color == null || _nextData.color == "" ? _defaultMatColor : _nextData.color,
            out Color targetColor
        );
        if (targetColor == null)
        {
            Debug.Log($"invalid color {_nextData.color} falling back to {_defaultMatColor}");
            ColorUtility.TryParseHtmlString(_defaultMatColor, out targetColor);
        }
        var currentColor = _prevData == null ? targetColor : _dynamicMatProps.GetColor("_Color");
        _dynamicMatProps.SetColor(
            "_Color",
            Color.Lerp(currentColor, targetColor, popInCurve.Evaluate(_t))
        );
        rend.SetPropertyBlock(_dynamicMatProps);

        if (transform.position == targetWorldPos && currentColor == targetColor)
        {
            _t = 0;
            _prevData = _nextData;
        }
    }
}
