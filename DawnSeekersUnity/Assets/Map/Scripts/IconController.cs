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
    private Vector3Int _currentCubeCoords;

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
        Setup(cell);
        _iconRenderer.sprite = sprite;
        _label.text = label;
    }

    public void Setup(MapManager.MapCell cell)
    {
        _currentCubeCoords = cell.cubicCoords;
        _trans.position = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(_currentCubeCoords));
    }

    public void CheckPosition(MapManager.MapCell cell)
    {
        if(cell.cubicCoords != _currentCubeCoords)
        {
            _currentCubeCoords = cell.cubicCoords;
            StartCoroutine(SmoothMoveCR(MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(_currentCubeCoords))));
        }
    }

    public void DestroyIcon()
    {
        Destroy(gameObject);// TODO: Add pooling
    }
}
