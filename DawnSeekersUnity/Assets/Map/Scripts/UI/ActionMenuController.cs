using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ActionMenuController : MonoBehaviour
{
    private void Start()
    {
        Cog.PluginController.Instance.EventTileInteraction += OnTileInteraction;
        gameObject.SetActive(false);
    }

    private void OnDestroy()
    {
        Cog.PluginController.Instance.EventTileInteraction -= OnTileInteraction;
    }

    private void OnTileInteraction(Vector3Int cellPosCube)
    {
        bool isPlayerAtPosition = SeekerManager.Instance.IsPlayerAtPosition(cellPosCube);
        if(isPlayerAtPosition)
        {
            gameObject.SetActive(true);
            transform.position = MapManager.instance.grid.CellToWorld(GridExtensions.CubeToGrid(cellPosCube));
        }
        else
        {
            gameObject.SetActive(false);
        }
    }
}
