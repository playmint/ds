using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MapInteractionManager : MonoBehaviour
{
    [SerializeField]
    Transform cursor;
    [SerializeField]
    Grid grid;

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

            //Move your cube GameObject to the point where you clicked
            cursor.position = grid.CellToWorld(grid.WorldToCell(hitPoint));
        }
        if (Input.GetMouseButtonDown(0))
        {
            MapClicked();
        }
    }

    void MapClicked()
    {
        var cellPosOddR = grid.WorldToCell(cursor.position);
        var cellPosCube = grid.GridToCube(cellPosOddR);
        var cellPosOddRConvert = grid.CubeToGrid(cellPosCube);

        Debug.Log("Cell Odd r coords: " + cellPosOddR);
        Debug.Log("Cell Cube coords " + cellPosCube );
        Debug.Log("Cell Odd r coords converted from cube " + cellPosOddRConvert);
    }
}
