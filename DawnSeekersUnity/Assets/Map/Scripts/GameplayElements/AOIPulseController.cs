using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using Cog;
using System;

public class AOIPulseController : MonoBehaviour
{
    [SerializeField]
    GameObject greenHighlightPrefab;

    List<Animator> _spawnedHighlights = new List<Animator>();

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
        if (gameState == null || gameState.Selected == null)
        {
            return;
        }
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

        if (_spawnedHighlights.Count == 0)
        {
            for (int i = 0; i < positions.Length; i++)
            {
                Animator highlight = Instantiate(greenHighlightPrefab).GetComponent<Animator>();
                _spawnedHighlights.Add(highlight);
            }
        }

        for (int i = 0; i < positions.Length; i++)
        {
            _spawnedHighlights[i].transform.position = MapManager.instance.grid.CellToWorld(
                GridExtensions.CubeToGrid(positions[i])
            );
            if (MapManager.instance.IsDiscoveredTile(positions[i]))
            {
                _spawnedHighlights[i].transform.position = new Vector3(
                    _spawnedHighlights[i].transform.position.x,
                    MapHeightManager.instance.GetHeightAtPosition(
                        _spawnedHighlights[i].transform.position
                    ),
                    _spawnedHighlights[i].transform.position.z
                );
            }
            else
            {
                _spawnedHighlights[i].transform.position = new Vector3(
                    _spawnedHighlights[i].transform.position.x,
                    MapHeightManager.UNSCOUTED_HEIGHT,
                    _spawnedHighlights[i].transform.position.z
                );
            }
            _spawnedHighlights[i].SetTrigger("Pulse");
        }
    }

    private void ClearHighlights()
    {
        foreach (Animator highlight in _spawnedHighlights)
        {
            Destroy(highlight.gameObject);
        }
        _spawnedHighlights.Clear();
    }
}
