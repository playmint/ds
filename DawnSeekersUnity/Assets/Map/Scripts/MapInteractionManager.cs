using System.Collections;
using System.Collections.Generic;
using UnityEngine;

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
        
        }
        else
        {
            selectedMarker2.gameObject.SetActive(true);
        
            MapManager.isMakingMove = false;
        }
        var cellPosOddR = MapManager.instance.grid.WorldToCell(cursor.position);
        var cellPosCube = GridExtensions.GridToCube(cellPosOddR);
        var cellPosOddRConvert = GridExtensions.CubeToGrid(cellPosCube);
        Debug.Log("Cell Odd r coords: " + cellPosOddR);
        Debug.Log("Cell Cube coords " + cellPosCube );
        Debug.Log("Cell Clicked at position " + GridExtensions.GridToCube(MapManager.instance.grid.WorldToCell(cursor.position)));
    }
}
