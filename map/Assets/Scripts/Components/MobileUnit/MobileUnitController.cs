using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using ColorUtility = UnityEngine.ColorUtility;

public class MobileUnitController : BaseComponentController<MobileUnitData>
{
    [SerializeField]
    protected Transform modelParent;

    [SerializeField]
    protected GameObject[] unitPrefabs;

    [SerializeField]
    protected Color highlightColor;

    [SerializeField]
    private AnimationCurve _moveCurve,
        _jumpCurve,
        _visibilityCurve;

    [SerializeField]
    private float offsetRadius = 0.29f;

    public Material redOutlineMat,
        greenOutlineMat;
    protected Color _defaultColor;
    protected string _defaultBodyColor;

    private Transform _meshesTrans;

    private Coroutine? _runningMovementCR;

    List<MobileUnitModelController> units = new();

    protected void Start()
    {
        _meshesTrans = transform.GetChild(0);
        ShowUnitModel("Unit_Hoodie_07");
    }

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }

        if (_nextData.model != null)
        {
            if (
                _prevData == null
                || _nextData.model != _prevData.model
                || _nextData.color != _prevData.color
            )
            {
                DestoryPreviousModels();
                ShowUnitModel(_nextData.model);
            }
        }
        else if (_prevData.model != null && _nextData.model != _prevData.model)
        {
            ShowUnitModel("Unit_Hoodie_07"); //Reset model
        }

        // movement
        if (_prevData == null)
        {
            Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
            Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
            transform.position =
                new Vector3(worldPos.x, _nextData.height, worldPos.z) + GetOffset(_nextData.shared);
        }
        else if (
            _prevData.q != _nextData.q || _prevData.r != _nextData.r || _prevData.s != _nextData.s
        )
        {
            Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
            Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords) + GetOffset(_nextData.shared);

            if (_runningMovementCR != null)
            {
                StopCoroutine(_runningMovementCR);
            }

            _runningMovementCR = StartCoroutine(
                SmoothMoveCR(new Vector3(worldPos.x, _nextData.height, worldPos.z))
            );
        }

        // selected
        if (_nextData?.selected == "outline")
        {
            foreach (MobileUnitModelController unit in units)
            {
                foreach (Renderer outlineObj in unit.outlineRenderers)
                {
                    outlineObj.material = redOutlineMat;
                }
                foreach (Renderer rend in unit.renderers)
                {
                    rend.material.SetColor("_EmissionColor", _defaultColor);
                }
            }
        }
        else if (_nextData?.selected == "highlight")
        {
            foreach (MobileUnitModelController unit in units)
            {
                foreach (Renderer outlineObj in unit.outlineRenderers)
                {
                    outlineObj.material = greenOutlineMat;
                }
                foreach (Renderer rend in unit.renderers)
                {
                    rend.material.SetColor("_EmissionColor", highlightColor);
                }
            }
        }
        else
        {
            foreach (MobileUnitModelController unit in units)
            {
                foreach (Renderer outlineObj in unit.outlineRenderers)
                {
                    outlineObj.material = greenOutlineMat;
                }
                foreach (Renderer rend in unit.renderers)
                {
                    rend.material.SetColor("_EmissionColor", _defaultColor);
                }
            }
        }

        // Visibility
        foreach (MobileUnitModelController unit in units)
        {
            if (_prevData == null)
            {
                if (unit._runningVisibilityCR != null)
                {
                    StopCoroutine(unit._runningVisibilityCR);
                }
                unit._runningVisibilityCR = StartCoroutine(
                    unit.VisibilityCR(
                        new Vector3(1, 1, 1),
                        _nextData.visible ? 1 : 0,
                        _visibilityCurve
                    )
                );
            }
            else if (_prevData.visible && !_nextData.visible)
            {
                if (unit._runningVisibilityCR != null)
                {
                    StopCoroutine(units[0]._runningVisibilityCR);
                }
                unit._runningVisibilityCR = StartCoroutine(
                    unit.VisibilityCR(new Vector3(1, 1, 1), 0, _visibilityCurve, 0.35f, 3.5f)
                );
            }
            else if (!_prevData.visible && _nextData.visible)
            {
                if (unit._runningVisibilityCR != null)
                {
                    StopCoroutine(unit._runningVisibilityCR);
                }
                unit._runningVisibilityCR = StartCoroutine(
                    unit.VisibilityCR(new Vector3(1, 1, 1), 1, _visibilityCurve)
                );
            }
        }

        _prevData = _nextData;
    }

    private Vector3 GetOffset(bool isShared)
    {
        var offset = Vector3.zero;
        if (isShared)
            offset = GetPositionOnCircle(offsetRadius, 6, 0);

        return offset;
    }

    private Vector3 GetPositionOnCircle(float radius, int numObjects, int index)
    {
        float angle = (float)index / numObjects * 360f;
        angle += 180;
        float x = radius * Mathf.Sin(angle * Mathf.Deg2Rad);
        float z = radius * Mathf.Cos(angle * Mathf.Deg2Rad);
        float y = 0;
        return new Vector3(x, y, z);
    }

    // Animations

    private IEnumerator SmoothMoveCR(Vector3 endPos)
    {
        float t = 0;
        Vector3 startPos = transform.position;
        while (t < 1)
        {
            t += Time.deltaTime * 1.5f;
            transform.position = Vector3.Lerp(startPos, endPos, _moveCurve.Evaluate(t));
            transform.position = Vector3.Lerp(
                new Vector3(transform.position.x, transform.position.y, transform.position.z),
                new Vector3(transform.position.x, endPos.y + 0.5f, transform.position.z),
                _jumpCurve.Evaluate(t)
            );
            yield return null;
        }
        transform.position = endPos;
        _runningMovementCR = null;
    }

    void DestoryPreviousModels()
    {
        foreach (MobileUnitModelController child in units)
        {
            Destroy(child.gameObject);
        }
        foreach (Transform child in modelParent)
        {
            Destroy(child.gameObject);
        }
        units = new();
    }

    private void ShowUnitModel(string modelName)
    {
        MobileUnitModelController unitController = CreateUnit(modelName, "Unit_Hoodie_07");

        foreach (Renderer rend in unitController.renderers)
        {
            _defaultColor = rend.material.GetColor("_EmissionColor");
        }

        units.Add(unitController);
    }

    private MobileUnitModelController CreateUnit(string prefabName, string defaultModel)
    {
        GameObject prefab = unitPrefabs.FirstOrDefault(n => n.name == prefabName);
        if (prefab == null)
            prefab = unitPrefabs.FirstOrDefault(n => n.name == defaultModel);
        MobileUnitModelController controller = Instantiate(prefab, modelParent)
            .GetComponent<MobileUnitModelController>();
        return controller;
    }
}
