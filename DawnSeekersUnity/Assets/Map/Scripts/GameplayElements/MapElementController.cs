using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MapElementController : MonoBehaviour
{
    [SerializeField]
    private AnimationCurve _moveCurve;

    private Vector3 _currentPosition;
    private float _offsetRadius = 0.35f;

    public void Setup(Vector3Int cell)
    {
        Setup(cell, 0, 0);
        
    }

    public void Setup(Vector3Int cell, int numObjects, int index)
    {
        Vector3 offset = GetOffset(numObjects, index);
        transform.position = _currentPosition =
            MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell)) + offset;
        _currentPosition = new Vector3(
            _currentPosition.x,
            _currentPosition.y,
            MapHeightManager.instance.GetHeightAtPosition(_currentPosition)
        );
        transform.position = _currentPosition;
    }

    private Vector3 GetOffset(int numObjects, int index)
    {
        Vector3 offset = Vector3.zero + (Vector3.forward);
        ;
        if (numObjects > 1)
            offset = GetPositionOnCircle(_offsetRadius, numObjects, index);

        return offset;
    }

    public static Vector3 GetPositionOnCircle(float radius, int numObjects, int index)
    {
        float angle = (float)index / numObjects * 360f;
        angle += 180;
        float x = radius * Mathf.Sin(angle * Mathf.Deg2Rad);
        float z = 0;
        float y = radius * Mathf.Cos(angle * Mathf.Deg2Rad);
        return new Vector3(x, y, z);
    }

    public void CheckPosition(Vector3Int cell, int numObjects, int index, bool isPlayer)
    {
        Vector3 offset = GetOffset(numObjects, index);
        Vector3 serverPosition =
            MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell)) + offset;
        serverPosition = new Vector3(
            serverPosition.x,
            serverPosition.y,
            MapHeightManager.instance.GetHeightAtPosition(serverPosition)
        );
        if (serverPosition != _currentPosition)
        {
            //if (isPlayer)
            //MapInteractionManager.instance.travelMarkerController.HideLine();
            _currentPosition =
                MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell)) + offset;
            _currentPosition = new Vector3(
                _currentPosition.x,
                _currentPosition.y,
                MapHeightManager.instance.GetHeightAtPosition(_currentPosition)
            );
            StartCoroutine(SmoothMoveCR(_currentPosition));
        }
    }

    private IEnumerator SmoothMoveCR(Vector3 endPos)
    {
        float t = 0;
        Vector3 startPos = transform.position;
        while (t < 1)
        {
            t += Time.deltaTime;
            transform.position = Vector3.Lerp(startPos, endPos, _moveCurve.Evaluate(t));
            yield return null;
        }
        transform.position = endPos;
    }
}
