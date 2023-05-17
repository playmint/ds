using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Cog;
using UnityEngine;

public class UseIntent : IntentHandler
{
    public static UseIntent instance;
    private bool _isActiveIntent;
    private Vector3Int _seekerPos;
    private Vector3Int[] _validTilePositions;

    // TODO: put in base class
    private Dictionary<Vector3Int, GameObject> _spawnedValidHighlights;
    private Dictionary<Vector3Int, GameObject> _spawnedSelectedHighlights;

    [SerializeField]
    private GameObject _validHighlightPrefab,
        _selectedHighlightPrefab;

    UseIntent()
    {
        Intent = IntentKind.USE;
    }

    private void Awake()
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
        if (state.Selected.Intent == Intent)
        {
            _isActiveIntent = true;
            _seekerPos = TileHelper.GetTilePosCube(state.Selected.Seeker.NextLocation);
            _validTilePositions = GetValidTilePositions(state);

            var selection = GetSelectedTilePositions(state);
            HighlightSelectedTiles(selection);

            // Highlight the valid tiles that haven't been selected
            HighlightValidTiles(
                _validTilePositions
                    .Where(cellPosCube => !_spawnedSelectedHighlights.ContainsKey(cellPosCube))
                    .ToArray()
            );
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

        if (_spawnedSelectedHighlights.ContainsKey(cellPosCube))
        {
            //return;

            // NOTE: This code allows us to deselect a tile if we decide to reintroduce
            //
            // Deselect tile (This is always going to yield an empty list but keeping it here for posterity)
            var tileIDs = _spawnedSelectedHighlights
                .Where(kvp => kvp.Key != cellPosCube)
                .Select(kvp => TileHelper.GetTileID(kvp.Key))
                .ToList();

             GameStateMediator.Instance.SendSelectTileMsg(tileIDs);
        }
        else if (_validTilePositions.Contains(cellPosCube))
        {
            // set the selection to just the clicked tile i.e. doesn't add to selection like scout or move does
            GameStateMediator.Instance.SendSelectTileMsg(
                new List<string>() { TileHelper.GetTileID(cellPosCube) }
            );
        }
    }

    private void OnTileRightClick(Vector3Int cellPosCube)
    {
#if UNITY_EDITOR
#elif UNITY_WEBGL
        return;
#endif
        if (!_isActiveIntent)
            return;
    }

    private Vector3Int[] GetValidTilePositions(GameState state)
    {
        var neighbourTiles = TileHelper.GetTileNeighbours(_seekerPos);
        return neighbourTiles
            .Where(cellPosCube =>
            {
                return TileHelper.IsDiscoveredTile(cellPosCube)
                    && TileHelper.HasBuilding(cellPosCube);
            })
            .ToArray();
    }

    // -- Tile Highlighting

    private void HighlightValidTiles(Vector3Int[] tilePositions)
    {
        HighlightTiles(tilePositions, _validHighlightPrefab, _spawnedValidHighlights);
    }

    private void HighlightSelectedTiles(Vector3Int[] tilePositions)
    {
        // Filter selection to only contain valid tiles
        var validTilePositions = tilePositions
            .Where(cellPosCube => _validTilePositions.Contains(cellPosCube))
            .ToArray();

        Vector3Int[] selection;
        if (validTilePositions.Length > 0)
        {
            // We only care about the first valid tile
            selection = new Vector3Int[1] { validTilePositions[0] };
        }
        else
        {
            selection = Array.Empty<Vector3Int>();
        }

        HighlightTiles(selection, _selectedHighlightPrefab, _spawnedSelectedHighlights);
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

    // TODO: Move to base class or put into a seperate class all intents can use
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
                Vector3 cellPos = MapManager.instance.grid.CellToWorld(
                    GridExtensions.CubeToGrid(cellPosCube)
                );
                highlight.transform.position = new Vector3(
                    cellPos.x,
                    MapHeightManager.instance.GetHeightAtPosition(cellPos),
                    cellPos.z
                );
                spawnedHighlights.Add(cellPosCube, highlight);
            }
        }
    }
}
