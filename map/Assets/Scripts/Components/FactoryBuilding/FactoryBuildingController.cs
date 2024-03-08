using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEngine;

public class FactoryBuildingController : BaseComponentController<FactoryBuildingData>
{
    [SerializeField]
    private Color highlightColor;

    [SerializeField]
    private Color[] diffuseColors;

    [SerializeField]
    private Color[] shadowColors;

    [SerializeField]
    private Transform[] stackPositions;

    [SerializeField]
    private GameObject[] totemPrefabs;

    [SerializeField]
    private GameObject[] overridePrefabs;

    public Material redOutlineMat,
        greenOutlineMat;

    /* private List<Renderer>? outlineObjs = new(); */
    /* private List<Renderer>? renderers = new(); */
    List<FactoryBuildingBlockController> _blocks = new();

    private Color _defaultColor;

    private Animator _currentAnimator;

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

        Color dynamicColor;
        Color shadowColor;

        int colorID;

        if (int.TryParse(_nextData.color, out colorID))
        {
            dynamicColor = diffuseColors[colorID % 6];
            shadowColor = shadowColors[colorID % 6];
        }
        else
        {
            dynamicColor = diffuseColors[0];
            shadowColor = shadowColors[0];
        }

        if (_nextData.model != null)
        {
            if (
                _prevData == null
                || _nextData.model != _prevData.model
                || _nextData.color != _prevData.color
            )
            {
                if (_nextData.model.Contains("door"))
                {
                    GameObject prefab = overridePrefabs.FirstOrDefault(
                        (p) => p.name == _nextData.model
                    );
                    if (_currentAnimator != null && _nextData.model.Contains("open"))
                    {
                        StartCoroutine(WaitForAnimationEndCR(prefab, "DoorUnlock", dynamicColor, shadowColor));
                    }
                    else
                    {
                        SwapModels(prefab, dynamicColor, shadowColor);
                    }
                }
                else
                {
                    DestoryPreviousModels();
                    ShowTotems(_nextData.model, dynamicColor, shadowColor);
                }
            }
        }
        else
        {
            Debug.LogError("Building stack codes are null");
        }

        // selected
        if (_nextData?.selected == "outline")
        {
            foreach (FactoryBuildingBlockController block in _blocks)
            {
                foreach (Renderer outlineObj in block.outlineRenderers)
                {
                    outlineObj.material = redOutlineMat;
                }
                foreach (Renderer rend in block.renderers)
                {
                    rend.material.SetColor("_EmissionColor", _defaultColor);
                }
            }
        }
        else if (_nextData?.selected == "highlight")
        {
            foreach (FactoryBuildingBlockController block in _blocks)
            {
                foreach (Renderer outlineObj in block.outlineRenderers)
                {
                    outlineObj.material = greenOutlineMat;
                }
                foreach (Renderer rend in block.renderers)
                {
                    rend.material.SetColor("_EmissionColor", highlightColor);
                }
            }
        }
        else
        {
            foreach (FactoryBuildingBlockController block in _blocks)
            {
                foreach (Renderer outlineObj in block.outlineRenderers)
                {
                    outlineObj.material = greenOutlineMat;
                }
                foreach (Renderer rend in block.renderers)
                {
                    rend.material.SetColor("_EmissionColor", _defaultColor);
                }
            }
        }

        _prevData = _nextData;
    }

    private IEnumerator WaitForAnimationEndCR(GameObject nextModel, string animName, Color dynamicColor, Color shadowColor)
    {
        _currentAnimator.Play(animName);
        yield return null;
        while (_currentAnimator.GetCurrentAnimatorStateInfo(0).normalizedTime < 1)
        {
            yield return null;
        }
        SwapModels(nextModel, dynamicColor, shadowColor);
        yield return null;
    }

    void SwapModels(GameObject nextModel, Color dynamicColor, Color shadowColor)
    {
        DestoryPreviousModels();
        FactoryBuildingBlockController controller = Instantiate(nextModel, stackPositions[0]).GetComponent<FactoryBuildingBlockController>();
        controller.transform.GetChild(0).TryGetComponent(out _currentAnimator);

        foreach (Renderer rend in controller.renderers)
        {
            rend.material.SetColor("_DynamicColor", dynamicColor);
            rend.material.SetColor("_DynamicShadowColor", shadowColor);
        }

        _blocks.Add(controller);
    }

    void DestoryPreviousModels()
    {
        foreach (FactoryBuildingBlockController child in _blocks)
        {
            Destroy(child.gameObject);
        }
        foreach (Transform child in stackPositions[0])
        {
            Destroy(child.gameObject);
        }
        _blocks = new();
    }

    private string[] GetTotemNamesFromStackCode(string stackCode)
    {
        string[] names = new string[2];
        Regex rx = new Regex(@"\d{2}");
        MatchCollection matches = rx.Matches(stackCode);
        if (matches.Count != 2)
        {
            names[0] = "00";
            names[1] = "00";
        }
        else
        {
            names[0] = matches[0].Value;
            names[1] = matches[1].Value;
        }
        return names;
    }

    private void ShowTotems(string stackCode, Color dynamicColor, Color shadowColor)
    {
        string[] totemNames = GetTotemNamesFromStackCode(stackCode);

        FactoryBuildingBlockController bottomBlock = CreateBlock(
            "Base_" + totemNames[0],
            stackPositions[0],
            "Base_01",
            dynamicColor,
            shadowColor
        );
        FactoryBuildingBlockController topBlock = CreateBlock(
            "Roof_" + totemNames[1],
            stackPositions[1],
            "Roof_01",
            dynamicColor,
            shadowColor
        );

        foreach (Renderer rend in bottomBlock.renderers)
        {
            _defaultColor = rend.material.GetColor("_EmissionColor");
        }

        _blocks.Add(bottomBlock);
        _blocks.Add(topBlock);
    }

    private FactoryBuildingBlockController CreateBlock(
        string prefabName,
        Transform stackPos,
        string defaultBuilding,
        Color dynamicColor,
        Color shadowColor
    )
    {
        GameObject prefab = totemPrefabs.FirstOrDefault(n => n.name == prefabName);
        if (prefab == null)
            prefab = totemPrefabs.FirstOrDefault(n => n.name == defaultBuilding);
        FactoryBuildingBlockController controller = Instantiate(prefab, stackPos)
            .GetComponent<FactoryBuildingBlockController>();
        foreach (Renderer rend in controller.renderers)
        {
            rend.material.SetColor("_DynamicColor", dynamicColor);
            rend.material.SetColor("_DynamicShadowColor", shadowColor);
        }
        return controller;
    }
}
