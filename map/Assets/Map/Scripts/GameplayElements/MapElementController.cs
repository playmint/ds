using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Cog;
using UnityEngine;

public class MapElementController : MonoBehaviour
{
    [SerializeField]
    protected Transform iconParent;

    [SerializeField]
    protected GameObject iconPrefab;

    [SerializeField]
    protected Renderer[] outlineObjs;

    [SerializeField]
    private bool createIcon = true;

    [SerializeField]
    protected Renderer[] renderers;

    [SerializeField]
    protected Color highlightColor;

    protected IconController _icon;
    protected Vector3 _currentPosition;

    protected string _id;

    protected Color _defaultColor;

    protected bool outlineActivated;

    private void Awake()
    {
        GameStateMediator.Instance.EventStateUpdated += StateUpdated;
    }

    private void OnDestroy()
    {
        GameStateMediator.Instance.EventStateUpdated -= StateUpdated;
    }

    public void Setup(Vector3Int cell, Transform parent, string id)
    {
        _defaultColor = renderers[0].material.GetColor("_EmissionColor");
        _id = id;
        Vector3 pos = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell));
        float height = MapHeightManager.instance.GetHeightAtPosition(pos);
        if (parent != null)
            height = parent.position.y;
        _currentPosition = pos;
        _currentPosition = new Vector3(_currentPosition.x, height, _currentPosition.z);
        transform.position = _currentPosition;
        if (parent != null)
        {
            transform.SetParent(parent, true);
        }
        if (createIcon)
            _icon = MapElementManager.instance.CreateIcon(iconParent, iconPrefab);
    }

    public void DestroyMapElement()
    {
        if (createIcon)
            _icon.DestroyIcon();
        Destroy(gameObject);
    }

    public string GetElementID()
    {
        foreach (Renderer rend in renderers)
        {
            rend.material.SetColor("_EmissionColor", highlightColor);
        }
        return _id;
    }

    private void Update()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);

        RaycastHit hit;
        if (Physics.Raycast(ray, out hit))
        {
            if (hit.transform == transform && !outlineActivated)
            {
                foreach (Renderer rend in renderers)
                {
                    rend.material.SetColor("_EmissionColor", highlightColor);
                }
                return;
            }
        }
        foreach (Renderer rend in renderers)
        {
            rend.material.SetColor("_EmissionColor", _defaultColor);
        }
    }

    private void StateUpdated(GameState state)
    {
        Tiles tile = null;
        bool activateOutline = false;
        if (
            state.Selected != null && state.Selected.Tiles != null && state.Selected.Tiles.Count > 0
        )
        {
            tile = state.Selected.Tiles.First();
            if (tile != null)
            {
                if ((tile.Building != null && tile.Building.Id == _id) || _id.Contains(tile.Id))
                {
                    activateOutline = true;
                }
            }
        }
        if (state.Selected.MapElementID != null)
        {
            if (state.Selected.MapElementID == _id)
            {
                activateOutline = true;
            }
        }
        if (activateOutline)
        {
            foreach (Renderer outlineObj in outlineObjs)
            {
                outlineActivated = true;
                outlineObj.material = MapElementManager.instance.redOutlineMat;
            }
            return;
        }
        foreach (Renderer outlineObj in outlineObjs)
        {
            outlineActivated = false;
            outlineObj.material = MapElementManager.instance.greenOutlineMat;
        }
        foreach (Renderer rend in renderers)
        {
            rend.material.SetColor("_Emission", _defaultColor);
        }
    }
}
