using System.Linq;
using System.Runtime.InteropServices;
using System.Text.RegularExpressions;
using Unity.VisualScripting;
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

    public Material redOutlineMat, greenOutlineMat;

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
        transform.GetChild(0).localEulerAngles = new Vector3(0, float.Parse(_nextData.rotation), 0);
        
        if (_prevData == null)
        {
            if(_nextData.model != null)
                ShowTotems(_nextData.model);
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
        if (
            matches.Count != 2
        )
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

    private void ShowTotems(string stackCode)
    {
        string[] totemNames = GetTotemNamesFromStackCode(stackCode);

        renderers = new Renderer[2];
        outlineObjs = new Renderer[2];
        for (int i = 0; i < 2; i++)
        {
            renderers[i] = Instantiate(
                    totemPrefabs.FirstOrDefault(n => n.name == totemNames[i]),
                    stackPositions[i]
                )
                .GetComponentInChildren<Renderer>();

            outlineObjs[i] = renderers[i].transform.GetChild(0).GetComponent<Renderer>();
        }
        _defaultColor = renderers[0].material.GetColor("_EmissionColor");
    }
}
