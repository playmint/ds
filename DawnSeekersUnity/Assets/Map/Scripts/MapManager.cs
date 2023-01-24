using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Tilemaps;

public class MapManager : MonoBehaviour
{
    public struct MapCell
    {
        public Vector3Int cubicCoords;
        public int typeID;
        public int iconID;
        public string cellName;
    }

    [SerializeField]
    private Tilemap _tilemap;
    [SerializeField]
    private Tile[] _tileTypes;

    public void ReceiveMapData()
    {
        ClearMap();
        //Add tiles:
    }

    public void ClearMap()
    {
        _tilemap.ClearAllTiles();
    }

    public void AddTile(MapCell cell)
    {
        _tilemap.SetTile(GridExtensions.CubeToGrid(cell.cubicCoords), _tileTypes[cell.typeID]);
    }
}
