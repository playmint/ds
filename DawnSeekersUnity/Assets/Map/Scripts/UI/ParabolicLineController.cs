using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ParabolicLineController : MonoBehaviour
{
    [SerializeField]
    private int _resolution = 10;

    [SerializeField]
    private float _lineHeight = 1;

    [SerializeField]
    private float _lineHeightAdditionPerDistance = 0.1f;

    [SerializeField]
    private AnimationCurve _lineCurve;
    private LineRenderer line;

    private void Awake()
    {
        line = GetComponent<LineRenderer>();
        line.positionCount = _resolution + 1;
    }

    //private void Update()
    //{
    //    if (MapInteractionManager.CurrentSelectedCell != null && MapManager.isMakingMove)
    //    {
    //        if (MapInteractionManager.CurrentSelectedCell != MapInteractionManager.CurrentMouseCell)
    //        {
    //            DrawLine(
    //                MapManager.instance.grid.CellToWorld(MapInteractionManager.CurrentSelectedCell),
    //                MapManager.instance.grid.CellToWorld(MapInteractionManager.CurrentMouseCell)
    //            );
    //            line.enabled = true;
    //        }
    //        else
    //        {
    //            line.enabled = false;
    //        }
    //    }
    //    else
    //    {
    //        line.enabled = false;
    //    }
    //}

    public void HideLine()
    {
        line.enabled = false;
    }

    public void DrawLine(Vector3 startPos, Vector3 endPos)
    {
        line.enabled = true;
        Vector3[] positions = new Vector3[_resolution + 1];
        for (int i = 0; i < _resolution; i++)
        {
            Vector3 dir = (endPos - startPos) / _resolution;
            positions[i] = startPos + (dir * i);
            positions[i].y +=
                _lineCurve.Evaluate((float)i / (float)_resolution)
                * (
                    _lineHeight
                    + (Vector3.Distance(startPos, endPos) * _lineHeightAdditionPerDistance)
                );
        }
        positions[_resolution] = endPos;
        line.SetPositions(positions);
    }
}
