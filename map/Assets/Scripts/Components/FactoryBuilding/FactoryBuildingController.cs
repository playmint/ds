using System.Collections.Generic;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using UnityEngine;
using UnityEngine.EventSystems;

public class FactoryBuildingController : BaseComponentController<FactoryBuildingData>
{
    [SerializeField]
    private Color highlightColor;

    [SerializeField]
    private Transform[] stackPositions;

    [SerializeField]
    private GameObject[] totemPrefabs;

    public Material redOutlineMat,
        greenOutlineMat;

    private List<Renderer>? outlineObjs = new();
    private List<Renderer>? renderers = new();

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
        if (!string.IsNullOrEmpty(_nextData.color) && !string.IsNullOrEmpty(_nextData.shadowColor))
        {
            ColorUtility.TryParseHtmlString(_nextData.color, out dynamicColor);
            ColorUtility.TryParseHtmlString(_nextData.shadowColor, out shadowColor);
        }
        else
        {
            ColorUtility.TryParseHtmlString("#2DAEE0", out dynamicColor);
            ColorUtility.TryParseHtmlString("#135198", out shadowColor);
        }

        if (_prevData == null)
        {
            if (_nextData.model != null)
                ShowTotems(_nextData.model, dynamicColor, shadowColor);
            else
                Debug.LogError("Building stack codes are null");
        }

        // selected
        if (outlineObjs == null || renderers == null)
            return;
        if (_nextData.selected == "outline")
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineObj.material = redOutlineMat;
            }
            foreach (Renderer rend in renderers)
            {
                rend.material.SetColor("_EmissionColor", _defaultColor);
            }
        }
        else if (_nextData.selected == "highlight")
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineObj.material = greenOutlineMat;
            }
            foreach (Renderer rend in renderers)
            {
                rend.material.SetColor("_EmissionColor", highlightColor);
            }
        }
        else
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineObj.material = greenOutlineMat;
            }
            foreach (Renderer rend in renderers)
            {
                rend.material.SetColor("_EmissionColor", _defaultColor);
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

        renderers = new();
        outlineObjs = new();
        GetRenderers("Base_" + totemNames[0], stackPositions[0], "Base_01");
        GetRenderers("Roof_" + totemNames[1], stackPositions[1], "Roof_01");
        _defaultColor = renderers[0].material.GetColor("_EmissionColor");

        foreach(Renderer rend in renderers)
        {
            rend.material.SetColor("_DynamicColor", dynamicColor);
            rend.material.SetColor("_DynamicShadowColor", shadowColor);
        }
    }

    private void GetRenderers(string prefabName, Transform stackPos, string defaultBuilding = "")
    {
        GameObject prefab = totemPrefabs.FirstOrDefault(n => n.name == prefabName);
        if (prefab == null)
            prefab = totemPrefabs.FirstOrDefault(n => n.name == defaultBuilding);
        FactoryBuildingBlockController controller = Instantiate(prefab, stackPos).GetComponent<FactoryBuildingBlockController>();

        renderers.AddRange(controller.renderers);
        outlineObjs.AddRange(controller.outlineRenderers);
    }
}
