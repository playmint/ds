using System.Runtime.InteropServices;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;
using ColorUtility = UnityEngine.ColorUtility;

public class LightController : BaseComponentController<LightData>
{
    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }

        Vector3Int targetCubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 targetWorldPos = CoordsHelper.CubeToWorld(targetCubeCoords);
        targetWorldPos.y = _nextData.height;

        transform.position = targetWorldPos;

        _prevData = _nextData;
    }
}
