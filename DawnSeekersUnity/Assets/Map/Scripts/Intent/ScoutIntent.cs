using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using Cog;

public class ScoutIntent : MonoBehaviour
{
    public static ScoutIntent instance;
    private bool _isActiveIntent;
    private Vector3Int[] _validTilePositions;

    [SerializeField]
    private GameObject _validHighlightPrefab,
        _selectedHighlightPrefab;

    private Dictionary<Vector3Int, GameObject> _spawnedValidHighlights;
    private Dictionary<Vector3Int, GameObject> _spawnedSelectedHighlights;

    private Vector3Int _seekerPos;

    protected void Awake()
    {
        instance = this;

        _validTilePositions = Array.Empty<Vector3Int>();
        _spawnedValidHighlights = new Dictionary<Vector3Int, GameObject>();
        _spawnedSelectedHighlights = new Dictionary<Vector3Int, GameObject>();
    }

    protected void Start()
    {
        GameStateMediator.Instance.EventStateUpdated += OnStateUpdated;
        MapInteractionManager.instance.EventTileLeftClick += OnTileLeftClick;
        MapInteractionManager.instance.EventTileRightClick += OnTileRightClick;
    }

    private void OnDestroy()
    {
        GameStateMediator.Instance.EventStateUpdated -= OnStateUpdated;
        MapInteractionManager.instance.EventTileLeftClick -= OnTileLeftClick;
        MapInteractionManager.instance.EventTileRightClick -= OnTileRightClick;
    }

    private void OnStateUpdated(GameState state)
    {
        if (state.Selected.Intent == Intent.SCOUT)
        {
            _isActiveIntent = true;
            _seekerPos = TileHelper.GetTilePosCube(state.Selected.Seeker.NextLocation);

            _validTilePositions = GetValidTilePositions(state);
            // If no valid places to scout take player out of SCOUT intent (Probably not the map's job to do this?)
            if (_validTilePositions.Length == 0)
            {
                GameStateMediator.Instance.SendSetIntentMsg(Intent.NONE);
            }

            var selection = GetSelectedTilePositions(state);
            HighlightSelectedTiles(selection);

            // Highlight the valid tiles that haven't been selected
            HighlightValidTiles(
                _validTilePositions.Where(cellPosCube => !selection.Contains(cellPosCube)).ToArray()
            );

            // Clean up the selection - deselect tiles that have been scouted
            var validSelectedTileIDs = selection
                .Where(
                    cellPosCube =>
                        _validTilePositions.Contains(cellPosCube) || cellPosCube == _seekerPos
                )
                .Select(cellPosCube => TileHelper.GetTileID(cellPosCube))
                .ToList();

            GameStateMediator.Instance.SendSelectTileMsg(validSelectedTileIDs);
        }
        else
        {
            _isActiveIntent = false;
            RemoveAllHighlights();
        }
    }

    private void OnTileLeftClick(Vector3Int cellPosCube)
    {
        if (!_isActiveIntent)
            return;

        // Should clicking the seeker tile set the intent to NONE?
        // Either way we don't want to deselect the seeker tile otherwise we lose the action menu!
        if (cellPosCube == _seekerPos)
            return;

        if (_spawnedSelectedHighlights.ContainsKey(cellPosCube))
        {
            // Deselect tile
            var tileIDs = _spawnedSelectedHighlights
                .Where(kvp => kvp.Key != cellPosCube)
                .Select(kvp => TileHelper.GetTileID(kvp.Key))
                .ToList();

            GameStateMediator.Instance.SendSelectTileMsg(tileIDs);
        }
        else if (_validTilePositions.Contains(cellPosCube))
        {
            // Add new tile to selected tile
            var tileIDs = _spawnedSelectedHighlights
                .Select(kvp => TileHelper.GetTileID(kvp.Key))
                .ToList();
            tileIDs.Add(TileHelper.GetTileID(cellPosCube));

            GameStateMediator.Instance.SendSelectTileMsg(tileIDs);
        }
    }

    private void OnTileRightClick(Vector3Int cellPosCube)
    {
        // NOTE: Quirk with the way the action menu works, the seeker tile is selected which isn't a
        // tile we want to scout so we have to check each postion to scout isn't this postion

        // Right click completes the scout. We are lacking a SCOUT_MULTI atm so will just rattle off the txs sequentially
        foreach (var kvp in _spawnedSelectedHighlights)
        {
            var pos = kvp.Key;
            if (pos != _seekerPos)
                GameStateMediator.Instance.ScoutTile(pos);
        }

        // Scout the right clicked tile if it wasn't already selected
        if (
            _validTilePositions.Contains(cellPosCube)
            && !_spawnedSelectedHighlights.ContainsKey(cellPosCube)
        )
        {
            GameStateMediator.Instance.ScoutTile(cellPosCube);
        }
    }

    private Vector3Int[] GetSelectedTilePositions(GameState state)
    {
        return state.Selected.Tiles.Select(tile => TileHelper.GetTilePosCube(tile)).ToArray();
    }

    protected void Update()
    {
        if (_isActiveIntent)
        {
            Vector3Int cubeMousePos = GridExtensions.GridToCube(
                MapInteractionManager.CurrentMouseCell
            );
            if (IsValidScoutTile(cubeMousePos))
            {
                if (IsTileSelected(cubeMousePos))
                {
                    TooltipManager.instance.ShowTooltip(
                        "Right-click to <b>Scout</b>\nLeft-click to <b>Undo</b>"
                    );
                }
                else
                {
                    TooltipManager.instance.ShowTooltip(
                        "Right-click to <b>Scout</b>\nLeft-click to <b>Add</b>"
                    );
                }
            }
        }
    }

    private void RemoveAllHighlights()
    {
        foreach (var kvp in _spawnedSelectedHighlights)
        {
            Destroy(kvp.Value);
        }
        foreach (var kvp in _spawnedValidHighlights)
        {
            Destroy(kvp.Value);
        }

        _spawnedSelectedHighlights.Clear();
        _spawnedValidHighlights.Clear();
    }

    private void HighlightValidTiles(Vector3Int[] tilePositions)
    {
        HighlightTiles(tilePositions, _validHighlightPrefab, _spawnedValidHighlights);
    }

    private void HighlightSelectedTiles(Vector3Int[] tilePositions)
    {
        HighlightTiles(tilePositions, _selectedHighlightPrefab, _spawnedSelectedHighlights);
    }

    private void HighlightTiles(
        Vector3Int[] tilePositions,
        GameObject highlightPrefab,
        Dictionary<Vector3Int, GameObject> spawnedHighlights
    )
    {
        // Destroy tiles that are no longer on the list
        var oldHighlights = spawnedHighlights
            .Where(kvp => !tilePositions.Contains(kvp.Key))
            .ToArray();

        foreach (var kvp in oldHighlights)
        {
            Destroy(kvp.Value);
            spawnedHighlights.Remove(kvp.Key);
        }

        // Highlight tiles on the list that haven't been highlighted
        foreach (Vector3Int cellPosCube in tilePositions)
        {
            if (!spawnedHighlights.ContainsKey(cellPosCube))
            {
                GameObject highlight = Instantiate(highlightPrefab);
                highlight.transform.position = MapManager.instance.grid.CellToWorld(
                    GridExtensions.CubeToGrid(cellPosCube)
                );
                spawnedHighlights.Add(cellPosCube, highlight);
            }
        }
    }

    private bool IsValidScoutTile(Vector3Int cellPosCube)
    {
        return _validTilePositions != null && _validTilePositions.Contains(cellPosCube);
    }

    private bool IsTileSelected(Vector3Int cellPosCube)
    {
        return _spawnedSelectedHighlights.ContainsKey(cellPosCube);
    }

    private Vector3Int[] GetValidTilePositions(GameState state)
    {
        var neighbourTiles = TileHelper.GetTileNeighbours(_seekerPos);
        return neighbourTiles
            .Where(cellPosCube =>
            {
                return !TileHelper.IsDiscoveredTile(cellPosCube);
            })
            .ToArray();
    }
}
