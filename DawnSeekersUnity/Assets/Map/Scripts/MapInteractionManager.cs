using System.Collections;
using System.Collections.Generic;
using Cog.GraphQL;
using UnityEngine;
using UnityEngine.Tilemaps;

public class MapInteractionManager : MonoBehaviour
{
    public static Vector3Int CurrentSelectedCell;
    public static Vector3Int CurrentMouseCell;

    [SerializeField]
    Transform cursor,selectedMarker1,selectedMarker2;

    Plane m_Plane;

    private void Start()
    {
        m_Plane = new Plane(Vector3.forward,0);

        Cog.PluginController.Instance.StateUpdated += OnStateUpdated;
        Cog.PluginController.Instance.FetchState();
    }

    private void Update()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);

        //Initialise the enter variable
        float enter = 0.0f;

        if (m_Plane.Raycast(ray, out enter))
        {
            //Get the point that is clicked
            Vector3 hitPoint = ray.GetPoint(enter);

            CurrentMouseCell = MapManager.instance.grid.WorldToCell(hitPoint);
            cursor.position = MapManager.instance.grid.CellToWorld(MapManager.instance.grid.WorldToCell(hitPoint));
        }
        if (Input.GetMouseButtonDown(0))
        {
            MapClicked();
        }
    }

    void MapClicked()
    {
        CurrentSelectedCell = CurrentMouseCell;
        selectedMarker1.gameObject.SetActive(true);
        if (!MapManager.isMakingMove)
        {
            MapManager.isMakingMove = true;
            selectedMarker2.gameObject.SetActive(false);
            selectedMarker1.position = MapManager.instance.grid.CellToWorld(CurrentSelectedCell);
        }
        else
        {
            selectedMarker2.gameObject.SetActive(true);
            selectedMarker2.position = MapManager.instance.grid.CellToWorld(CurrentSelectedCell);
            MapManager.isMakingMove = false;
        }
        var cellPosOddR = MapManager.instance.grid.WorldToCell(cursor.position);
        var cellPosCube = GridExtensions.GridToCube(cellPosOddR);
        var cellPosOddRConvert = GridExtensions.CubeToGrid(cellPosCube);
        Debug.Log("Cell Odd r coords: " + cellPosOddR);
        Debug.Log("Cell Cube coords " + cellPosCube );
        Debug.Log("Cell Clicked at position " + GridExtensions.GridToCube(MapManager.instance.grid.WorldToCell(cursor.position)));

        Cog.PluginController.Instance.OnTileClick(cellPosCube);
    }

    private void OnStateUpdated(State state)
    {
        Debug.Log("State Updated!!");
        foreach(var tile in state.Tiles)
        {
            var q = System.Convert.ToInt16(tile.Coords[1], 16);
            var r = System.Convert.ToInt16(tile.Coords[2], 16);
            var s = System.Convert.ToInt16(tile.Coords[3], 16);
            
            var cellPosCube = new Vector3Int(q,r,s);
            // var cellPosOddR = GridExtensions.CubeToGrid(cellPosCube);

            // tilemap.SetTile(cellPosOddR, _tileRevealed);

            var cell = new MapManager.MapCell {
                cubicCoords = cellPosCube, 
                typeID = 0, 
                iconID = 0,
                cellName = ""
            };

            MapManager.instance.AddTile(cell);
        }
        
    }
}
