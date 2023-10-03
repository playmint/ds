using System.Runtime.InteropServices;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;

public class BagController : BaseComponentController<BagData>
{
    [SerializeField]
    protected Renderer[] outlineObjs;

    [SerializeField]
    protected Renderer[] renderers;

    [SerializeField]
    protected Color highlightColor;

    public Material redOutlineMat,
        greenOutlineMat;

    private Color _defaultColor;

    protected void Start()
    {
        _defaultColor = renderers[0].material.GetColor("_EmissionColor");
    }

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }

        // position
        Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        transform.position = new Vector3(worldPos.x, _nextData.height, worldPos.z);
        transform.eulerAngles = new Vector3(
            transform.rotation.x,
            _nextData.corner % 6 * 60f,
            transform.rotation.z
        );

        // selected
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

        // rotation (which edge to place bag at)


        _prevData = _nextData;
    }
}
