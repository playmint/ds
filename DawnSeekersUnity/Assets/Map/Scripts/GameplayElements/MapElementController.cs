using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MapElementController : MonoBehaviour
{
    [SerializeField]
    protected Transform iconParent;

    [SerializeField]
    protected GameObject iconPrefab;

    protected IconController _icon;
    protected Vector3 _currentPosition;

    public void Setup(Vector3Int cell)
    {
        Vector3 pos = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell));
        float height = MapHeightManager.instance.GetHeightAtPosition(pos);
        _currentPosition = pos;
        _currentPosition = new Vector3(_currentPosition.x, _currentPosition.y, height);
        transform.position = _currentPosition;

        _icon = MapElementManager.instance.CreateIcon(iconParent, iconPrefab);
    }

    public void DestroyMapElement()
    {
        _icon.DestroyIcon();
        Destroy(gameObject);
    }
}
