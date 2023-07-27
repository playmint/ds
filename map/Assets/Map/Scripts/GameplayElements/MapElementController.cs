using System.Collections;
using System.Collections.Generic;
using Cog;
using UnityEngine;

public class MapElementController : MonoBehaviour
{
    [SerializeField]
    protected Transform iconParent;

    [SerializeField]
    protected GameObject iconPrefab;

    [SerializeField]
    protected GameObject outlineObj;

    [SerializeField]
    private bool createIcon = true;

    [SerializeField]
    protected Renderer rend;

    [SerializeField]
    protected Color highlightColor;

    protected IconController _icon;
    protected Vector3 _currentPosition;

    protected string _id;

    protected Color _defaultColor;

    private void Awake()
    {
        _defaultColor = rend.material.GetColor("_EmissionColor");
        GameStateMediator.Instance.EventStateUpdated += StateUpdated;
    }

    private void OnDestroy()
    {
        GameStateMediator.Instance.EventStateUpdated -= StateUpdated;
    }

    public void Setup(Vector3Int cell, Transform parent, string id)
    {
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
        rend.material.SetColor("_EmissionColor", highlightColor);
        return _id;
    }

    private void Update()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);

        RaycastHit hit;
        if (Physics.Raycast(ray, out hit))
        {
            if (hit.transform == transform && !outlineObj.activeSelf)
            {
                rend.material.SetColor("_EmissionColor", highlightColor);
                return;
            }
        }
        rend.material.SetColor("_EmissionColor", _defaultColor);
    }

    private void StateUpdated(GameState state)
    {
        if (state.Selected.MapElementID != null)
        {
            if (state.Selected.MapElementID == _id)
            {
                outlineObj.SetActive(true);
                return;
            }
        }
        outlineObj.SetActive(false);
        rend.material.SetColor("_Emission", _defaultColor);
    }
}
