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
        // Cog.PluginController.Instance.EventStateUpdated += OnStateUpdated;

        // NOTE: Decoupled from global UI because of a bug during movment where if the seeker
        // Moves over a tile that is selected, it would see that the selected tile is at the
        // Seeker's position and show the action menu again! Might have been able to get round this
        // by checking the isMoving flag but for now simpler to just decouple from global state
        MapInteractionManager.instance.EventTileLeftClick += OnTileLeftClick;

        gameObject.SetActive(false);
    }

    private void OnDestroy()
    {
        // Cog.PluginController.Instance.EventStateUpdated += OnStateUpdated;

        MapInteractionManager.instance.EventTileLeftClick -= OnTileLeftClick;
    }

    private void OnTileLeftClick(Vector3Int cellPosCube)
    {
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

    // -- This code was driven by the global UI state which was causing some problems
    // private void OnStateUpdated(State state)
    // {
    //     if (state.UI.Selection.Tiles != null && state.UI.Selection.Tiles.Count > 0)
    //     {
    //         var tile = state.UI.Selection.Tiles.ToList()[0];
    //         var cellPosCube = TileHelper.GetTilePosCube(tile);
    //         bool isPlayerAtPosition = SeekerManager.Instance.IsPlayerAtPosition(cellPosCube);
    //         if (isPlayerAtPosition)
    //         {
    //             gameObject.SetActive(true);
    //             transform.position = MapManager.instance.grid.CellToWorld(
    //                 GridExtensions.CubeToGrid(cellPosCube)
    //             );
    //         }
    //         else
    //         {
    //             gameObject.SetActive(false);
    //         }
    //     }
    //     else
    //     {
    //         gameObject.SetActive(false);
    //     }
    // }
}
