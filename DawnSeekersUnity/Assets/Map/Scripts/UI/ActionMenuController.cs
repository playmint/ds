using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Cog;
using UnityEngine;

public class ActionMenuController : MonoBehaviour
{
    private void Start()
    {
        Cog.PluginController.Instance.EventStateUpdated += OnStateUpdated;
    }

    private void OnDestroy()
    {
        Cog.PluginController.Instance.EventStateUpdated += OnStateUpdated;
    }

    private void OnStateUpdated(State state)
    {
        var tile = state.UI.Selection.Tiles.ToList()[0];
        var cellPosCube = TileHelper.GetTilePosCube(tile);
        bool isPlayerAtPosition = SeekerManager.Instance.IsPlayerAtPosition(cellPosCube);
        if (isPlayerAtPosition)
        {
            gameObject.SetActive(true);
            transform.position = MapManager.instance.grid.CellToWorld(
                GridExtensions.CubeToGrid(cellPosCube)
            );
        }
        else
        {
            gameObject.SetActive(false);
        }
    }
}
