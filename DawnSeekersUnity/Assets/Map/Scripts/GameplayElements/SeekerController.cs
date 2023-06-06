using System;
using System.Collections;
using System.Collections.Generic;
using Cog;
using UnityEngine;

public class SeekerController : MapElementController
{
    public System.Action<Vector3Int, SeekerController> moveStepStarted;

    [SerializeField]
    GameObject nonPlayerIconPrefab;

    [SerializeField]
    Renderer rend;

    [SerializeField]
    GameObject outlineObj;

    [SerializeField]
    float shrinkScale;

    [SerializeField]
    private AnimationCurve _moveCurve,
        _jumpCurve,
        _shrinkCurve;

    [SerializeField]
    private Color highlightColor;

    protected int _currentIndex;
    private float _currentSize;
    private Transform _meshesTrans;
    private float _offsetRadius = 0.26f;

    private string _seekerID;
    private Color _defaultColor;

    private void Awake()
    {
        GameStateMediator.Instance.EventStateUpdated += StateUpdated;
        _defaultColor = rend.material.GetColor("_Emission");
        rend.material.SetFloat("_Fade", 1);
    }

    private void Update()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);

        RaycastHit hit;
        if (Physics.Raycast(ray, out hit))
        {
            if (hit.transform == transform && !outlineObj.activeSelf)
            {
                rend.material.SetColor("_Emission", highlightColor);
                return;
            }
        }
        rend.material.SetColor("_Emission", _defaultColor);
    }

    private void OnDestroy()
    {
        GameStateMediator.Instance.EventStateUpdated -= StateUpdated;
    }

    private void StateUpdated(GameState state)
    {
        if (state.Selected.Seeker != null)
        {
            if (state.Selected.Seeker.Id == _seekerID)
            {
                outlineObj.SetActive(true);
                return;
            }
        }
        outlineObj.SetActive(false);
        rend.material.SetColor("_Emission", _defaultColor);
    }

    public void Setup(Vector3Int cell, int numObjects, int index, bool isPlayer, string seekerID)
    {
        _seekerID = seekerID;
        _meshesTrans = transform.GetChild(0);

        //If there's a building on the cell, we want to be in front of it:
        int isElementAtCell = MapElementManager.instance.IsElementAtCell(cell);
        Vector3 offset = GetOffset(isElementAtCell);

        //Shrank 'em if you gotta:
        _currentSize = isElementAtCell > 0 ? shrinkScale : 1;
        _meshesTrans.localScale = index > 0 ? Vector3.zero : Vector3.one * _currentSize;

        Vector3 pos = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell));
        float height = MapHeightManager.instance.GetHeightAtPosition(pos);
        _currentPosition = pos + offset;
        _currentPosition = new Vector3(_currentPosition.x, height, _currentPosition.z);
        transform.position = _currentPosition;

        GetComponent<Collider>().enabled = isPlayer;

        // Prepare icon:
        if (isPlayer)
            _icon = MapElementManager.instance.CreateIcon(iconParent, iconPrefab);
        else
            _icon = MapElementManager.instance.CreateIcon(iconParent, nonPlayerIconPrefab);

        _icon.PrepareIcon(index, numObjects - isElementAtCell);
        _icon.UpdateIcon();
    }

    public string GetSeekerID()
    {
        rend.material.SetColor("_Emission", highlightColor);
        return _seekerID;
    }

    public void CheckPosition(Vector3Int cell, int numObjects, int index, bool isPlayer)
    {
        int isElementAtCell = MapElementManager.instance.IsElementAtCell(cell);
        _icon.PrepareIcon(index, numObjects - isElementAtCell);
        if (numObjects - isElementAtCell == 1)
        {
            _icon.UpdateIcon();
        }
        else if (!isPlayer)
        {
            StartCoroutine(UpdateIconDelayCR(1));
        }

        Vector3 offset = GetOffset(isElementAtCell);
        float targetSize = isElementAtCell > 0 ? shrinkScale : 1;
        if (index != _currentIndex || targetSize != _currentSize)
        {
            _currentIndex = index;
            _currentSize = targetSize;
            if (index > 0)
                StartCoroutine(ShrinkCR(Vector3.one * _currentSize, 0, 0.35f));
            else
                StartCoroutine(ShrinkCR(Vector3.one * _currentSize, 1));
        }

        Vector3 serverPosition = MapManager.instance.grid.CellToWorld(
            GridExtensions.CubeToGrid(cell)
        );
        float height = MapHeightManager.instance.GetHeightAtPosition(serverPosition);
        serverPosition += offset;
        serverPosition = new Vector3(serverPosition.x, height, serverPosition.z);
        if (serverPosition != _currentPosition)
        {
            _currentPosition = serverPosition;
            moveStepStarted?.Invoke(cell, this);
            StartCoroutine(SmoothMoveCR(_currentPosition));
        }
    }

    protected Vector3 GetOffset(int isElementAtPosition)
    {
        Vector3 offset = Vector3.zero;
        if (isElementAtPosition > 0)
            offset = MapElementManager.GetPositionOnCircle(_offsetRadius, 6, 0);
        //offset = Vector3.zero + (Vector3.back * _offsetRadius);

        return offset;
    }

    private IEnumerator UpdateIconDelayCR(float delay)
    {
        yield return new WaitForSeconds(delay);
        _icon.UpdateIcon();
    }

    private IEnumerator SmoothMoveCR(Vector3 endPos)
    {
        float t = 0;
        Vector3 startPos = transform.position;
        while (t < 1)
        {
            t += Time.deltaTime;
            transform.position = Vector3.Lerp(startPos, endPos, _moveCurve.Evaluate(t));
            transform.position = Vector3.Lerp(
                new Vector3(transform.position.x, endPos.y, transform.position.z),
                new Vector3(transform.position.x, endPos.y + 0.5f, transform.position.z),
                _jumpCurve.Evaluate(t)
            );
            yield return null;
        }
        transform.position = endPos;
        _icon.UpdateIcon();
    }

    IEnumerator ShrinkCR(Vector3 endScale, float endFade, float delay = 0)
    {
        float t = 0;
        Vector3 startScale = _meshesTrans.localScale;
        float startFade = rend.material.GetFloat("_Fade");
        yield return new WaitForSeconds(delay);
        while (t < 1)
        {
            t += Time.deltaTime * 2;
            _meshesTrans.localScale = Vector3.LerpUnclamped(
                startScale,
                endScale,
                _shrinkCurve.Evaluate(t)
            );
            rend.material.SetFloat(
                "_Fade",
                Mathf.Lerp(startFade, endFade, _shrinkCurve.Evaluate(t))
            );
            yield return null;
        }
    }
}
