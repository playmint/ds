using System;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using Cog;

public class ScoutIntent : IntentHandler
{
    public static ScoutIntent instance;
    private bool _isActiveIntent;
    private Vector3Int[] _validTilePositions;

    [SerializeField]
    private GameObject _validHighlightPrefab,
        _selectedHighlightPrefab;

    // TODO: put in base class
    private Dictionary<Vector3Int, GameObject> _spawnedValidHighlights;
    private Dictionary<Vector3Int, GameObject> _spawnedSelectedHighlights;

    private Vector3Int _seekerPos;

    ScoutIntent()
    {
        Intent = IntentKind.SCOUT;
    }

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
        if (state.Selected.Intent == Intent)
        {
            _isActiveIntent = true;
            _seekerPos = TileHelper.GetTilePosCube(state.Selected.Seeker.NextLocation);
            _validTilePositions = GetValidTilePositions(state);

            // NOTE: Disabled as we probably don't want to map to switch intents unless the player explicitly asked for it
            // If no valid places to scout take player out of SCOUT intent (Probably not the map's job to do this?)
            // if (_validTilePositions.Length == 0)
            // {
            //     GameStateMediator.Instance.SendSetIntentMsg(Intent.NONE);
            // }

            var selection = GetSelectedTilePositions(state);
            HighlightSelectedTiles(selection);

            // Highlight the valid tiles that haven't been selected
            HighlightValidTiles(
                _validTilePositions.Where(cellPosCube => !selection.Contains(cellPosCube)).ToArray()
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

        // Should clicking the seeker tile set the intent to NONE?
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

    /**
     * This function executes the scout action
     *
     * NOTE: A quirk with the way the action menu works, the seeker tile is selected which isn't a
     * tile we want to scout so we have to check that each postion to scout isn't the seeker's
     *
     * NOTE: The _spwanedSelectedHighlights dictionary contains the filtered local state of what has been selected
     */
    private void OnTileRightClick(Vector3Int cellPosCube)
    {
#if UNITY_EDITOR
#elif UNITY_WEBGL
        return;
#endif
        if (!_isActiveIntent)
            return;

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

        // Clear the selection
        GameStateMediator.Instance.SendDeselectAllTilesMsg();
    }

    protected void Update() { }

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
        // Filter selection to only contain valid scout tiles
        var validTilePositions = tilePositions
            .Where(cellPosCube => _validTilePositions.Contains(cellPosCube))
            .ToArray();

        HighlightTiles(validTilePositions, _selectedHighlightPrefab, _spawnedSelectedHighlights);
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
                    MapHeightManager.UNSCOUTED_HEIGHT,
                    cellPos.z
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
