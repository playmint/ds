using UnityEngine;

public class ExtractorBuildingController : BaseComponentController<ExtractorBuildingData>
{
    [SerializeField]
    protected Renderer[] outlineObjs;

    [SerializeField]
    protected Renderer[] renderers;

    [SerializeField]
    protected Color highlightColor;

    [SerializeField]
    private Renderer gooRenderer;

    [SerializeField]
    Material normalMat,
        highlightMat;

    public Material redOutlineMat,
        greenOutlineMat;

    private Color _defaultColor;

    protected void Start()
    {
        //_defaultColor = renderers[0].material.GetColor("_EmissionColor");
    }

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
        Color gooCol;
        ColorUtility.TryParseHtmlString(_nextData.color, out gooCol);
        gooRenderer.material.SetColor("_BaseColor", gooCol);

        GetComponentInChildren<Animator>().Play("GooLevel", 0, _nextData.progress);

        _prevData = _nextData;

        // selected
        if (_nextData.selected == "outline")
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineObj.material = redOutlineMat;
            }
            foreach (Renderer rend in renderers)
            {
                rend.material = normalMat;//rend.material.SetColor("_EmissionColor", _defaultColor);
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
                rend.material = highlightMat;//rend.material.SetColor("_EmissionColor", highlightColor);
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
                rend.material = normalMat;//rend.material.SetColor("_EmissionColor", _defaultColor);
            }
        }
    }
}
