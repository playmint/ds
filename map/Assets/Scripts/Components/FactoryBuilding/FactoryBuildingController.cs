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

    private Renderer[]? outlineObjs;
    private Renderer[]? renderers;

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
            ColorUtility.TryParseHtmlString(_nextData.color, out shadowColor);
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

        renderers = new Renderer[2];
        outlineObjs = new Renderer[2];

        GameObject prefab = totemPrefabs.FirstOrDefault(n => n.name == "Base_" + totemNames[0]);
        if (prefab == null)
            prefab = totemPrefabs[0];
        renderers[0] = Instantiate(prefab, stackPositions[0]).transform
            .GetChild(0)
            .GetComponent<Renderer>();

        outlineObjs[0] = renderers[0].transform.parent.GetChild(1).GetComponent<Renderer>();

        prefab = totemPrefabs.FirstOrDefault(n => n.name == "Roof_" + totemNames[1]);
        if (prefab == null)
            prefab = totemPrefabs.FirstOrDefault(n => n.name == "Roof_01");
        renderers[1] = Instantiate(prefab, stackPositions[1]).transform
            .GetChild(0)
            .GetComponent<Renderer>();

        outlineObjs[1] = renderers[1].transform.parent.GetChild(1).GetComponent<Renderer>();

        _defaultColor = renderers[0].material.GetColor("_EmissionColor");

        renderers[0].material.SetColor("_DynamicColor", dynamicColor);
        renderers[0].material.SetColor("_DynamicShadowColor", shadowColor);
        renderers[1].material = renderers[0].material;
    }
}
