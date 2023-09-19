using System.Runtime.InteropServices;
using TMPro;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;

public class LabelController : BaseComponentController<LabelData>
{
    [SerializeField]
    TextMeshProUGUI text;

    Camera cam;
    RectTransform canvasRect;
    Vector3 worldPos;

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }
        if (canvasRect == null)
        {
            cam = Camera.main;
            canvasRect = GameObject.Find("Overlay").GetComponent<RectTransform>();
            transform.SetParent(canvasRect, false);
            transform.localEulerAngles = Vector3.zero;
        }
        Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        text.text = _nextData.text;
        _prevData = _nextData;
    }

    protected void LateUpdate()
    {
        if (canvasRect != null)
            transform.position = WorldToUIPosition(new Vector3(worldPos.x, _nextData.height, worldPos.z));
    }

    public Vector3 WorldToUIPosition(Vector3 worldPos)
    {
        Vector3 screenPos = Camera.main.WorldToScreenPoint(worldPos);
        Vector3 UIPos;
        RectTransformUtility.ScreenPointToWorldPointInRectangle(canvasRect, screenPos, cam, out UIPos);
        return UIPos;
    }
}
