using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEngine;

public class DisplayBuildingController : BaseComponentController<DisplayBuildingData>
{
    [SerializeField]
    private Color highlightColor;

    public Material redOutlineMat,
        greenOutlineMat;

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }
        Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        transform.position = new Vector3(worldPos.x, _nextData.height, worldPos.z);
        transform.GetChild(0).localEulerAngles = new Vector3(0, _nextData.rotation, 0);

        _prevData = _nextData;
    }
}
