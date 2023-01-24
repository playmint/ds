using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class IconManager : MonoBehaviour
{
    [SerializeField]
    private Grid _grid;

    [SerializeField]
    private GameObject _iconPrefab;

    [SerializeField]
    private MapIconList _iconList;

    private List<IconController> _spawnedIcons;

    private void Awake()
    {
        _spawnedIcons = new List<IconController>();
    }

    public void CreateMapIcon(MapManager.MapCell cell)
    {
        GameObject icon = Instantiate(_iconPrefab, transform);
        icon.transform.position = _grid.CellToWorld(GridExtensions.CubeToGrid(cell.cubicCoords));
        _spawnedIcons.Add(icon.GetComponent<IconController>());
        _spawnedIcons[_spawnedIcons.Count - 1].Setup(_iconList.icons[cell.iconID],cell.cellName);
    }

    public void ClearMapIcons()
    {
        foreach(IconController icon in _spawnedIcons)
        {
            icon.DestroyIcon();
        }
        _spawnedIcons.Clear();
    }
}
