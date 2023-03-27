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

        gameObject.SetActive(false);
    }

    private void OnDestroy()
    {
        Cog.PluginController.Instance.EventStateUpdated -= OnStateUpdated;
    }

    private void OnStateUpdated(State state)
    {
        if (state.Selected.Tiles != null && state.Selected.Tiles.Count > 0)
        {
            var tile = state.Selected.Tiles.ToList()[0];
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
        else
        {
            gameObject.SetActive(false);
        }
    }
}
