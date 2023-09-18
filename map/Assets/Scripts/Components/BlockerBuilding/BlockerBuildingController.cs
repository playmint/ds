using System.Linq;
using System.Runtime.InteropServices;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;

public class BlockerBuildingController : BaseComponentController<BlockerBuildingData>
{
    [SerializeField]
    private Color highlightColor;
    [SerializeField]
    GameObject[] modelPrefabs;
    [SerializeField]
    Transform meshParent;

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
            if (_nextData.model != null)
            {
                ShowModels(_nextData.model);
            }
            else
                Debug.LogError("Building model id is null");
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

    private void ShowModels(string modelName)
    {
        renderers = new Renderer[1];
        outlineObjs = new Renderer[1];
        renderers[0] = Instantiate(
                modelPrefabs.FirstOrDefault(n => n.name == modelName),
                meshParent
            )
            .GetComponentInChildren<Renderer>();

        outlineObjs[0] = renderers[0].transform.GetChild(0).GetComponent<Renderer>();
        _defaultColor = renderers[0].material.GetColor("_EmissionColor");
    }
}

