using Unity.VisualScripting;
using UnityEngine;

public class TileController : MonoBehaviour
{
    private TileData _nextData;
    private TileData _prevData;

    protected void Awake()
    {
        _nextData = new TileData();
        _prevData = _nextData;
    }

    public void Set(TileData newData)
    {
        _nextData = newData;
    }

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }
        Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        transform.position = new Vector3(worldPos.x, 0, worldPos.z);
        _prevData = _nextData;
    }
}
