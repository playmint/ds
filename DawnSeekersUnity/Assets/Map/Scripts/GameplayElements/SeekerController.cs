using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class SeekerController : MapElementController
{
    [SerializeField]
    GameObject nonPlayerIconPrefab;
    [SerializeField]
    float shrinkScale;
    [SerializeField]
    private AnimationCurve _moveCurve, _jumpCurve, _shrinkCurve;

    protected int _currentIndex;
    private float _currentSize;
    private Transform _meshesTrans;
    private float _offsetRadius = 0.35f;

    public void Setup(Vector3Int cell, int numObjects, int index, bool isPlayer)
    {
        _meshesTrans = transform.GetChild(0);

        //If there's a building on the cell, we want to be in front of it:
        int isElementAtCell = MapElementManager.instance.IsElementAtCell(cell);
        Vector3 offset = GetOffset(isElementAtCell);

        //Shrank 'em if you gotta:
        _currentSize = isElementAtCell > 0 ? shrinkScale : 1;
        _meshesTrans.localScale = index > 0? Vector3.zero : Vector3.one* _currentSize;

        Vector3 pos = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell));
        float height = MapHeightManager.instance.GetHeightAtPosition(pos);
        _currentPosition = pos + offset;
        _currentPosition = new Vector3(
            _currentPosition.x,
            _currentPosition.y,
            height
        );
        transform.position = _currentPosition;

        // Prepare icon:
        if(isPlayer)
            _icon = MapElementManager.instance.CreateIcon(iconParent, iconPrefab);
        else
            _icon = MapElementManager.instance.CreateIcon(iconParent, nonPlayerIconPrefab);

        _icon.PrepareIcon(index, numObjects- isElementAtCell);
        _icon.UpdateIcon();
    }

    public void CheckPosition(Vector3Int cell, int numObjects, int index, bool isPlayer)
    {
        int isElementAtCell = MapElementManager.instance.IsElementAtCell(cell);
        _icon.PrepareIcon(index, numObjects- isElementAtCell);
        if (!isPlayer || numObjects - isElementAtCell == 1)
        {
            _icon.UpdateIcon();
        }

        Vector3 offset = GetOffset(isElementAtCell);
        float targetSize = isElementAtCell>0?shrinkScale:1;
        if (index != _currentIndex || targetSize != _currentSize)
        {
            _currentIndex = index;
            _currentSize = targetSize;
            if (index > 0)
                StartCoroutine(ShrinkCR(Vector3.zero));
            else
                StartCoroutine(ShrinkCR(Vector3.one * _currentSize));
        }

        Vector3 serverPosition = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell));
        float height = MapHeightManager.instance.GetHeightAtPosition(serverPosition);
        serverPosition += offset;
        serverPosition = new Vector3(
            serverPosition.x,
            serverPosition.y,
            height
        );
        if (serverPosition != _currentPosition)
        {
            _currentPosition = serverPosition;
            StartCoroutine(SmoothMoveCR(_currentPosition));
        }
    }

    protected Vector3 GetOffset(int isElementAtPosition)
    {
        Vector3 offset = Vector3.zero;
        if(isElementAtPosition > 0)
            offset = Vector3.zero + (Vector3.down * _offsetRadius);

        return offset;
    }

    private IEnumerator SmoothMoveCR(Vector3 endPos)
    {
        float t = 0;
        Vector3 startPos = transform.position;
        while (t < 1)
        {
            t += Time.deltaTime;
            transform.position = Vector3.Lerp(startPos, endPos, _moveCurve.Evaluate(t));
            transform.position = Vector3.Lerp(new Vector3(transform.position.x, transform.position.y, endPos.z), new Vector3(transform.position.x, transform.position.y, endPos.z - 0.5f), _jumpCurve.Evaluate(t));
            yield return null;
        }
        transform.position = endPos;
        _icon.UpdateIcon();
    }

    IEnumerator ShrinkCR(Vector3 endScale)
    {
        float t = 0;
        Vector3 startScale = _meshesTrans.localScale;
        while (t < 1)
        {
            t += Time.deltaTime*2;
            _meshesTrans.localScale = Vector3.LerpUnclamped(startScale, endScale, _shrinkCurve.Evaluate(t));
            yield return null;
        }
    }
}
