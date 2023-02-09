using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class IconManager : MonoBehaviour
{
    public static IconManager instance;

    [SerializeField]
    private GameObject _buildingIconPrefab, _seekerIconPrefab, _otherSeekerIconPrefab;

    [SerializeField]
    private MapIconList _iconList;

    private List<IconController> _spawnedIcons;

    private Dictionary<Vector3Int, IconController> spawnedBuildingIcons;
    private Dictionary<string, IconController> spawnedSeekerIcons;

    private void Awake()
    {
        instance = this;
        spawnedSeekerIcons = new Dictionary<string, IconController>();
        spawnedBuildingIcons = new Dictionary<Vector3Int, IconController>();
        _spawnedIcons = new List<IconController>();
    }

    public void CreateBuildingIcon(Cog.GraphQL.Tile tile, MapManager.MapCell cell)
    {
        if (!spawnedBuildingIcons.ContainsKey(cell.cubicCoords))
        {
            IconController icon = Instantiate(_buildingIconPrefab, transform, true).GetComponent<IconController>();
            spawnedBuildingIcons.Add(cell.cubicCoords, icon);
            icon.Setup(cell,_iconList.icons[cell.iconID],cell.cellName);
        }
    }

    public void CreateSeekerIcon(Cog.GraphQL.Seeker seeker, MapManager.MapCell cell, bool isPlayer)
    {
        if (!spawnedSeekerIcons.ContainsKey(seeker.SeekerID))
        {
            IconController icon;
            if(isPlayer)
                icon = Instantiate(_seekerIconPrefab, transform, true).GetComponent<IconController>();
            else
                icon = Instantiate(_otherSeekerIconPrefab, transform, true).GetComponent<IconController>();
            spawnedSeekerIcons.Add(seeker.SeekerID, icon);
            icon.Setup(cell);
        }
        else
        {
            spawnedSeekerIcons[seeker.SeekerID].CheckPosition(cell);
        }
    }



    //public void CreateMapIcon(MapManager.MapCell cell)
    //{
    //    GameObject icon = Instantiate(_buildingIconPrefab, transform);
    //    icon.transform.position = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cell.cubicCoords));
    //    _spawnedIcons.Add(icon.GetComponent<IconController>());
    //    _spawnedIcons[_spawnedIcons.Count - 1].Setup(_iconList.icons[cell.iconID],cell.cellName);
    //}

    public void ClearMapIcons()
    {
        foreach(IconController icon in _spawnedIcons)
        {
            icon.DestroyIcon();
        }
        _spawnedIcons.Clear();
    }
}
