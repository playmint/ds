using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using Cog;

public class MoveIntent : IntentHandler
{
    public Action ClearTravelMarkers;
    public static MoveIntent instance;

    private static int BIOME_DISCOVERD = 1;

    [SerializeField]
    private GameObject travelMarkerPrefab,
        greenHighlightPrefab,
        orangeHighlightPrefab;

    private List<Vector3Int> _path; //cell positions in Cube Coordinates;
    private Dictionary<Vector3Int, GameObject> spawnedValidCellHighlights,
        spawnedPathHighlights;
    private Dictionary<Vector3Int, TravelMarkerController> _travelMarkers;
    private bool isMoving;
    private bool _isTracingPath; // HACK: Cannot make moves until the move CR has finished
    private Vector3Int _seekerPos;

    MoveIntent()
    {
        Intent = IntentKind.MOVE;
    }

    private void Awake()
    {
        instance = this;
        _path = new List<Vector3Int>();
        _travelMarkers = new Dictionary<Vector3Int, TravelMarkerController>();
        spawnedValidCellHighlights = new Dictionary<Vector3Int, GameObject>();
        spawnedPathHighlights = new Dictionary<Vector3Int, GameObject>();
    }

    private void Start()
    {
        MapInteractionManager.instance.EventTileLeftClick += OnTileLeftClick;
        MapInteractionManager.instance.EventTileRightClick += OnTileRightClick;
        GameStateMediator.Instance.EventStateUpdated += OnStateUpdated;
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
            _seekerPos = TileHelper.GetTilePosCube(state.Selected.Seeker.NextLocation);

            // HACK: Cannot be in move intent when the movement CR is running
            if (_isTracingPath)
            {
                GameStateMediator.Instance.SendSetIntentMsg(IntentKind.NONE);
                return;
            }

            if (!isMoving)
            {
                ActivateMovementMode();
            }

            var validPath = GetValidPath(state.Selected.Tiles.ToList());

            _path = HighlightPath(_path, validPath);

            HighlightAvailableSpaces();
        }

        if (state.Selected.Intent != Intent && isMoving)
        {
            DeactivateMovementMode();
        }
    }

    /**
     * Iterates over an unvalidated list of tiles and return a valid path
     * Doesn't do anything clever like find the best path with the set we have but just
     * Iterates over the path and skips over any tiles that wouldn't be a valid move from the previous tile
     */
    private List<Vector3Int> GetValidPath(List<Tiles> tiles)
    {
        // Seeker should always be at the first tile in the path
        var validPath = new List<Vector3Int>() { _seekerPos };
        if (tiles.Count == 0)
        {
            return validPath;
        }

        // If the first tile in the selected tiles is the seeker then skip over it
        var startIndex = TileHelper.GetTilePosCube(tiles[0]) == _seekerPos ? 1 : 0;
        for (var i = startIndex; i < tiles.Count; i++)
        {
            var tile = tiles[i];

            if (tile.Biome != BIOME_DISCOVERD)
                continue;

            var tilePosCube = TileHelper.GetTilePosCube(tile);

            // TODO: straight lines are actually valid so don't just check neighbour tiles
            var prevValidPos = validPath[validPath.Count - 1];
            var prevNeighbours = TileHelper.GetTileNeighbours(prevValidPos);

            // If not adjacent then skip over this tile
            if (!prevNeighbours.Contains(tilePosCube))
                continue;

            // Passed validity checks
            validPath.Add(tilePosCube);
        }

        return validPath;
    }

    private void Update()
    {
        if (
            GameStateMediator.Instance.gameState == null
            || GameStateMediator.Instance.gameState.World == null
        )
            return;
    }

    private void OnTileLeftClick(Vector3Int cellCubePos)
    {
        if (!isMoving)
            return;

        if (!TileHelper.IsDiscoveredTile(cellCubePos))
            return;

        if (_path.Count == 0 || _path[_path.Count - 1] != cellCubePos)
        {
            AddCellToPath(cellCubePos);
        }
        else
        {
            RemoveCellFromPath(cellCubePos);
        }
    }

    private void OnTileRightClick(Vector3Int cellCubePos)
    {
#if UNITY_EDITOR
#elif UNITY_WEBGL
        return;
#endif
        if (isMoving)
        {
            ClosePath(cellCubePos);
        }
    }

    /**
     * Returns a list of tiles that have been highlighted
     *
     * NOTE: Doesn't check the validity of the path
     */
    private List<Vector3Int> HighlightPath(List<Vector3Int> oldPath, List<Vector3Int> newPathTiles)
    {
        // if (oldPath.Count == newPathTiles.Count)
        //     return oldPath;

        var newPath = new List<Vector3Int>();

        // Remove highlights for tiles that are no longer in the list
        foreach (var oldPosCube in oldPath)
        {
            if (!newPathTiles.Exists((newPosCube) => newPosCube == oldPosCube))
            {
                // Destroy highlight
                if (spawnedPathHighlights.ContainsKey(oldPosCube))
                {
                    Destroy(spawnedPathHighlights[oldPosCube]);
                    spawnedPathHighlights.Remove(oldPosCube);
                }

                // Hide line.
                if (_travelMarkers.ContainsKey(oldPosCube))
                {
                    _travelMarkers[oldPosCube].HideLine(); // Destroys the GameObject
                    _travelMarkers.Remove(oldPosCube);
                }
            }
        }

        // Generate new path list making highlights for the new tiles
        for (var i = 0; i < newPathTiles.Count; i++)
        {
            var newPosCube = newPathTiles[i];

            // Highlights
            if (!spawnedPathHighlights.ContainsKey(newPosCube))
            {
                var highlight = Instantiate(orangeHighlightPrefab);
                Vector3 cellPos = MapManager.instance.grid.CellToWorld(
                    GridExtensions.CubeToGrid(newPosCube)
                );
                highlight.transform.position = new Vector3(
                    cellPos.x,
                    MapHeightManager.instance.GetHeightAtPosition(cellPos),
                    cellPos.z
                );
                spawnedPathHighlights.Add(newPosCube, highlight);
            }

            // Markers
            if (newPath.Count > 0 && !_travelMarkers.ContainsKey(newPosCube))
            {
                var prevTilePosCube = newPath[newPath.Count - 1];

                var travelMarker = Instantiate(travelMarkerPrefab)
                    .GetComponent<TravelMarkerController>();
                travelMarker.ShowTravelMarkers(prevTilePosCube, newPosCube);
                _travelMarkers.Add(newPosCube, travelMarker);
            }

            newPath.Add(newPosCube);
        }

        return newPath;
    }

    /*
     * Puts the local context into movement mode. Does not set intent
     */
    public void ActivateMovementMode()
    {
        if (isMoving)
            return;

        isMoving = true;
    }

    /*
     * Takes the local context out of movement mode. Does not set intent
     */
    public void DeactivateMovementMode()
    {
        if (!isMoving)
            return;

        isMoving = false;
        HideHighlights();
        HidePathHighlights();
        if (!_isTracingPath)
        {
            HideTravelMarkers();
        }
    }

    public void HighlightAvailableSpaces()
    {
        HideHighlights();

        if (_path.Count == 0)
            return;

        foreach (Vector3Int space in TileHelper.GetTileNeighbours(_path[_path.Count - 1]))
        {
            if (!spawnedPathHighlights.ContainsKey(space) && TileHelper.IsDiscoveredTile(space))
            {
                Transform highlight = Instantiate(greenHighlightPrefab).transform;
                highlight.position = MapManager.instance.grid.CellToWorld(
                    GridExtensions.CubeToGrid(space)
                );
                highlight.position = new Vector3(
                    highlight.position.x,
                    MapHeightManager.instance.GetHeightAtPosition(highlight.position),
                    highlight.position.z
                );
                spawnedValidCellHighlights.Add(space, highlight.gameObject);
            }
        }
    }

    private void HideHighlights()
    {
        foreach (KeyValuePair<Vector3Int, GameObject> go in spawnedValidCellHighlights)
        {
            Destroy(go.Value);
        }
        spawnedValidCellHighlights = new Dictionary<Vector3Int, GameObject>();
    }

    private void HidePathHighlights()
    {
        foreach (KeyValuePair<Vector3Int, GameObject> go in spawnedPathHighlights)
        {
            Destroy(go.Value);
        }
        spawnedPathHighlights = new Dictionary<Vector3Int, GameObject>();
    }

    private void HideTravelMarkers()
    {
        foreach (var kvp in _travelMarkers)
        {
            kvp.Value.HideLine();
        }

        _travelMarkers.Clear();
    }

    private void AddCellToPath(Vector3Int cellCubePos)
    {
        bool validPosition =
            _path.Count == 0
            || TileHelper.GetTileNeighbours(_path[_path.Count - 1]).Contains(cellCubePos);
        if (!_path.Any(p => p == cellCubePos) && validPosition)
        {
            var tileIDs = _path.Select(cellPosCube => TileHelper.GetTileID(cellPosCube)).ToList();
            tileIDs.Add(TileHelper.GetTileID(cellCubePos));
            GameStateMediator.Instance.SendSelectTileMsg(tileIDs);
        }
    }

    /*
     * Used as a way to hack round our inability to wait for a state update when adding the final tile
     */
    private void DirectAddCellToPathHack(Vector3Int cellCubePos)
    {
        bool validPosition =
            TileHelper.IsDiscoveredTile(cellCubePos)
            && (
                _path.Count == 0
                || TileHelper.GetTileNeighbours(_path[_path.Count - 1]).Contains(cellCubePos)
            );
        if (!_path.Any(p => p == cellCubePos) && validPosition)
        {
            // Add marker
            if (!_travelMarkers.ContainsKey(cellCubePos))
            {
                var prevTilePosCube = _path[_path.Count - 1];

                var travelMarker = Instantiate(travelMarkerPrefab)
                    .GetComponent<TravelMarkerController>();
                travelMarker.ShowTravelMarkers(prevTilePosCube, cellCubePos);
                _travelMarkers.Add(cellCubePos, travelMarker);
            }

            _path.Add(cellCubePos);
        }
    }

    private void RemoveCellFromPath(Vector3Int cellCubePos)
    {
        var tileIDs = _path
            .Where(p => p != cellCubePos)
            .Select(cellPosCube => TileHelper.GetTileID(cellPosCube))
            .ToList();

        // If we click elsewhere on the map and don't alter the path then don't make a state update
        if (tileIDs.Count != _path.Count)
        {
            GameStateMediator.Instance.SendSelectTileMsg(tileIDs);

            if (
                tileIDs.Count == 0
                && GameStateMediator.Instance.gameState.Selected.Intent == IntentKind.MOVE
            )
            {
                GameStateMediator.Instance.SendSetIntentMsg(IntentKind.NONE);
            }
        }
    }

    private void ClosePath(Vector3Int cellCubePos)
    {
        // AddCellToPath(cellCubePos); // TODO: This doesn't work because we can't await for the state change
        DirectAddCellToPathHack(cellCubePos); // HACK: Because of above :-/
        StartCoroutine(TracePathCR());

        // Select the last tile in the path and take out of move intent
        var lastTileID = TileHelper.GetTileID(_path[_path.Count - 1]);
        GameStateMediator.Instance.SendSelectTileMsg(new List<string>() { lastTileID });
        GameStateMediator.Instance.SendSetIntentMsg(IntentKind.NONE);
    }

    IEnumerator TracePathCR()
    {
        _isTracingPath = true;

        // Cloned so we aren't iterating over the path that can be manipulated outside of the CR
        var path = new List<Vector3Int>(_path);

        for (int i = 1; i < path.Count; i++)
        {
            var cellPosCube = path[i];
            GameStateMediator.Instance.MoveSeeker(
                SeekerManager.instance.currentSelectedSeeker,
                cellPosCube
            );
            yield return new WaitForSeconds(3.5f);
            if (_travelMarkers.ContainsKey(cellPosCube))
            {
                _travelMarkers[cellPosCube].HideLine();
                _travelMarkers.Remove(cellPosCube);
            }
        }

        _isTracingPath = false;
    }
}
