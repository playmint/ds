using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;

public class IconController : MonoBehaviour
{
    [SerializeField]
    private SpriteRenderer _iconRenderer;
    [SerializeField]
    private TextMeshPro _label;
    [SerializeField]
    private AnimationCurve _moveCurve;

    private Transform _trans, _camTrans;
    private Vector3 _currentPosition;
    private float _offsetRadius = 0.25f;

    private void Awake()
    {
        _trans = transform;
        _camTrans = Camera.main.transform;
    }

    private void LateUpdate()
    {
        _trans.rotation = _camTrans.rotation;
    }

    private IEnumerator SmoothMoveCR(Vector3 endPos)
    {
        float t = 0;
        Vector3 startPos = _trans.position;
        while(t<1)
        {
            t += Time.deltaTime;
            _trans.position = Vector3.Lerp(startPos, endPos, _moveCurve.Evaluate(t));
            yield return null;
        }
        _trans.position = endPos;
    }

    public void Setup(MapManager.MapCell cell, Sprite sprite, string label)
    {
        Setup(cell, 0,0);
        _iconRenderer.sprite = sprite;
        _label.text = label;
    }

    public void Setup(MapManager.MapCell cell, int numObjects, int index)
    {
        Vector3 offset = Vector3.zero;
        if (numObjects > 1)
            offset = GetPositionOnCircle(_offsetRadius, numObjects, index);
        _trans.position = _currentPosition = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell.cubicCoords)) + offset;
    }

    public void CheckPosition(MapManager.MapCell cell, int numObjects, int index)
    {
        Vector3 offset = Vector3.zero;
        if (numObjects > 1)
            offset = GetPositionOnCircle(_offsetRadius, numObjects, index);
        if (MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell.cubicCoords)) + offset != _currentPosition)
        {
            _currentPosition = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell.cubicCoords)) + offset;
            StartCoroutine(SmoothMoveCR(_currentPosition));
        }
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

    public void DestroyIcon()
    {
        Destroy(gameObject);// TODO: Add pooling
    }
}
