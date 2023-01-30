using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Tilemaps;

public class MapManager : MonoBehaviour
{
    public static MapManager instance;
    public static bool isMakingMove;


    public struct MapCell
    {
        public Vector3Int cubicCoords;
        public int typeID;
        public int iconID;
        public string cellName;
    }

    public Grid grid;

    [SerializeField]
    private Tilemap _tilemap;
    [SerializeField]
    private Tile[] _tileTypes;

    private void Awake()
    {
        instance = this;
    }

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
        Debug.Log($"MapManager::AddTile() Adding tile type: {cell.typeID} at: {cell.cubicCoords}");
        _tilemap.SetTile(GridExtensions.CubeToGrid(cell.cubicCoords), _tileTypes[cell.typeID]);
    }
}
