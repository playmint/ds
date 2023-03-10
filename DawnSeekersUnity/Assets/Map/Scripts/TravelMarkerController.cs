using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class TravelMarkerController : MonoBehaviour
{
    [SerializeField]
    Transform destinationMarker;

    [SerializeField]
    ParabolicLineController line;

    private void Start()
    {
        destinationMarker.gameObject.SetActive(false);
    }

    //private void Update()
    //{
    //    if (MapInteractionManager.CurrentSelectedCell != null && MapManager.isMakingMove)
    //    {
    //        if (MapInteractionManager.CurrentSelectedCell != MapInteractionManager.CurrentMouseCell)
    //        {
    //            ShowTravelMarkers(
    //                MapManager.instance.grid.CellToWorld(MapInteractionManager.CurrentSelectedCell),
    //                MapManager.instance.grid.CellToWorld(MapInteractionManager.CurrentMouseCell)
    //            );
    //            line.enabled = true;
    //        }
    //        else
    //        {
    //            //HideLine();
    //        }
    //    }
    //}

    public void ShowTravelMarkers(Vector3Int startPos, Vector3Int endPos, bool isCube = true)
    {
        if (isCube)
            ShowTravelMarkers(
                MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(startPos)),
                MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(endPos))
            );
        else
            ShowTravelMarkers(
                MapManager.instance.grid.CellToWorld(startPos),
                MapManager.instance.grid.CellToWorld(endPos)
            );
    }

    public void ShowTravelMarkers(Vector3 startPos, Vector3 endPos)
    {
        Vector3 worldEndPos = endPos;
        line.DrawLine(startPos, worldEndPos);
        destinationMarker.position = worldEndPos;
        destinationMarker.gameObject.SetActive(true);
    }

    public void HideLine()
    {
        //line.HideLine();
        Destroy(gameObject);
    }
}
