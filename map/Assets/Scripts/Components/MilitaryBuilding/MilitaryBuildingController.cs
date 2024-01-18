using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using UnityEngine;

public class MilitaryBuildingController : BaseComponentController<MilitaryBuildingData>
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

    public Material redOutlineMat,
        greenOutlineMat;

    /* private List<Renderer>? outlineObjs = new(); */
    /* private List<Renderer>? renderers = new(); */
    List<MilitaryBuildingBlockController> _blocks = new();

    private Color _defaultColor;

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
                foreach (MilitaryBuildingBlockController block in _blocks)
                {
                    Destroy(block.gameObject);
                }
                _blocks = new();
                ShowTotems(_nextData.model, dynamicColor, shadowColor);
            }
        }
        else
        {
            Debug.LogError("Building stack codes are null");
        }

        // selected
        if (_nextData?.selected == "outline")
        {
            foreach (MilitaryBuildingBlockController block in _blocks)
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
            foreach (MilitaryBuildingBlockController block in _blocks)
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
            foreach (MilitaryBuildingBlockController block in _blocks)
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

        MilitaryBuildingBlockController bottomBlock = CreateBlock(
            "Base_" + totemNames[0],
            stackPositions[0],
            "Base_01",
            dynamicColor,
            shadowColor
        );
        MilitaryBuildingBlockController topBlock = CreateBlock(
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

    private MilitaryBuildingBlockController CreateBlock(
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
        MilitaryBuildingBlockController controller = Instantiate(prefab, stackPos)
            .GetComponent<MilitaryBuildingBlockController>();
        foreach (Renderer rend in controller.renderers)
        {
            rend.material.SetColor("_DynamicColor", dynamicColor);
            rend.material.SetColor("_DynamicShadowColor", shadowColor);
        }
        return controller;
    }
}
