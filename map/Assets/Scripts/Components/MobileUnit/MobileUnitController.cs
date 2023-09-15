using System.Runtime.InteropServices;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;

public class MobileUnitController : BaseComponentController<MobileUnitData>
{
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

        _prevData = _nextData;
    }
}
