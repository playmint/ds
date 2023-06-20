using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Cog;
using System;

public class AOIPulseController : MonoBehaviour
{
    [SerializeField]
    GameObject greenHighlightPrefab;

    List<GameObject> _spawnedHighlights = new List<GameObject>();

    Seeker _currentSeeker;

    private void Start()
    {
        GameStateMediator.Instance.EventStateUpdated += GameStateUpdated;
    }

    private void OnDestroy()
    {
        GameStateMediator.Instance.EventStateUpdated -= GameStateUpdated;
    }

    private void GameStateUpdated(GameState gameState)
    {
        if (
            gameState.Selected.Seeker != null
            && (_currentSeeker == null || gameState.Selected.Seeker.Id != _currentSeeker.Id)
            && SeekerManager.instance.IsPlayerSeeker(gameState.Selected.Seeker.Id)
        )
        {
            _currentSeeker = gameState.Selected.Seeker;
            ShowHighlights(TileHelper.GetTilePosCube(gameState.Selected.Seeker.NextLocation));
        }
        else if (gameState.Selected.Seeker == null)
        {
            _currentSeeker = null;
        }
    }

    private void ShowHighlights(Vector3Int cubePos)
    {
        Vector3Int[] positions = TileHelper.GetTileNeighbours(cubePos);
        for (int i = 0; i < positions.Length; i++)
        {
            Transform highlight = Instantiate(greenHighlightPrefab).transform;
            highlight.position = MapManager.instance.grid.CellToWorld(
                GridExtensions.CubeToGrid(positions[i])
            );
            if (MapManager.instance.IsDiscoveredTile(positions[i]))
            {
                highlight.position = new Vector3(
                    highlight.position.x,
                    MapHeightManager.instance.GetHeightAtPosition(highlight.position),
                    highlight.position.z
                );
            }
            else
            {
                highlight.position = new Vector3(
                    highlight.position.x,
                    MapHeightManager.UNSCOUTED_HEIGHT,
                    highlight.position.z
                );
            }
            _spawnedHighlights.Add(highlight.gameObject);
        }
    }

    private void ClearHighlights()
    {
        foreach (GameObject highlight in _spawnedHighlights)
        {
            Destroy(highlight);
        }
        _spawnedHighlights.Clear();
    }
}
