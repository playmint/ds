using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using Cog;

public class SeekerMovementManager : MonoBehaviour
{
    public Action ClearTravelMarkers;
    public static SeekerMovementManager instance;

    private const int INTENTION_MOVE = 1;

    [SerializeField]
    private GameObject travelMarkerPrefab,
        greenHighlightPrefab,
        orangeHighlightPrefab;

    private List<Vector3Int> _path; //cell positions in Cube Coordinates;
    private Dictionary<Vector3Int, GameObject> spawnedValidCellHighlights,
        spawnedPathHighlights;
    private Dictionary<Vector3Int, TravelMarkerController> _travelMarkers;
    private bool isMoving;

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
        // Cog.PluginController.Instance.EventStateUpdated += OnStateUpdated;

        // NOTE: Not using the global UI state for path selection as it needs more thought due
        //       to problems where other player's movement would cause state updates
        //       and clicking on the same tile wouldn't change the state so Unity didn't get a state update
        MapInteractionManager.instance.EventTileLeftClick += OnTileLeftClick;
        MapInteractionManager.instance.EventTileRightClick += OnTileRightClick;
        PluginController.Instance.EventStateUpdated += OnStateUpdated;
    }

    private void OnDestroy()
    {
        // Cog.PluginController.Instance.EventStateUpdated -= OnStateUpdated;

        MapInteractionManager.instance.EventTileLeftClick -= OnTileLeftClick;
        MapInteractionManager.instance.EventTileRightClick -= OnTileRightClick;
    }

    private void Update()
    {
        if (
            PluginController.Instance.WorldState == null
            || PluginController.Instance.WorldState.Game == null
        )
            return;

        if (isMoving && _path.Count > 0)
        {
            Vector3Int cubeMousePos = GridExtensions.GridToCube(
                MapInteractionManager.CurrentMouseCell
            );
            if (MapInteractionManager.instance.IsDiscoveredTile(cubeMousePos))
            {
                if (
                    !spawnedPathHighlights.ContainsKey(cubeMousePos)
                    && TileHelper.GetTileNeighbours(_path[_path.Count - 1]).Contains(cubeMousePos)
                )
                {
                    TooltipManager.instance.ShowTooltip(
                        "Right-click to <b>Move</b>\nLeft-click to <b>Add</b>"
                    );
                }
                else if (_path[_path.Count - 1] == cubeMousePos)
                {
                    TooltipManager.instance.ShowTooltip(
                        "Right-click to <b>Move</b>\nLeft-click to <b>Undo</b>"
                    );
                }
            }
        }
    }

    private void OnTileLeftClick(Vector3Int cellCubePos)
    {
        if (!isMoving)
            return;

        if (!isValidTile(cellCubePos))
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
        if (isMoving)
        {
            ClosePath(cellCubePos);
        }
        else
        {
#if UNITY_EDITOR
            PluginController.Instance.ScoutTile(cellCubePos);
#endif
        }
    }

    private void OnStateUpdated(State state)
    {
        if (state.UI.Selection.Intention == INTENTION_MOVE)
        {
            if (!isMoving)
            {
                ActivateMovementMode();
            }

            _path = UpdatePath(_path, state.UI.Selection.IntentTiles.ToList<Tile>());
            if (_path.Count == 0)
            {
                AddCellToPath(GridExtensions.GridToCube(MapInteractionManager.CurrentSelectedCell));
            }

            HighlightAvailableSpaces();
        }

        if (state.UI.Selection.Intention != INTENTION_MOVE && isMoving)
        {
            DeactivateMovementMode();
        }
    }

    private List<Vector3Int> UpdatePath(List<Vector3Int> oldPath, List<Tile> newPathTiles)
    {
        var newPath = new List<Vector3Int>();

        // Remove highlights for tiles that are no longer in the list
        foreach (var cellPosCube in oldPath)
        {
            if (!newPathTiles.Exists((tile) => TileHelper.GetTilePosCube(tile) == cellPosCube))
            {
                // Destroy highlight
                if (spawnedPathHighlights.ContainsKey(cellPosCube))
                {
                    Destroy(spawnedPathHighlights[cellPosCube]);
                    spawnedPathHighlights.Remove(cellPosCube);
                }

                // Hide line.
                if (_travelMarkers.ContainsKey(cellPosCube))
                {
                    _travelMarkers[cellPosCube].HideLine();
                    // TODO: Destroy?
                }
            }
        }

        // Generate new path list making highlights for the new tiles
        for (var i = 0; i < newPathTiles.Count; i++)
        {
            var tile = newPathTiles[i];
            var cellPosCube = TileHelper.GetTilePosCube(tile);

            // Highlights
            if (!spawnedPathHighlights.ContainsKey(cellPosCube))
            {
                var highlight = Instantiate(orangeHighlightPrefab);
                highlight.transform.position = MapManager.instance.grid.CellToWorld(
                    GridExtensions.CubeToGrid(cellPosCube)
                );
                spawnedPathHighlights.Add(cellPosCube, highlight);
            }

            // Markers
            if (newPath.Count > 0 && !_travelMarkers.ContainsKey(cellPosCube))
            {
                var prevTilePosCube = newPath[newPath.Count - 1];

                var travelMarker = Instantiate(travelMarkerPrefab)
                    .GetComponent<TravelMarkerController>();
                travelMarker.ShowTravelMarkers(prevTilePosCube, cellPosCube);
                _travelMarkers.Add(cellPosCube, travelMarker);
            }

            newPath.Add(cellPosCube);
        }

        return newPath;
    }

    private bool isValidTile(Vector3Int cellCubePos)
    {
        var tile = MapInteractionManager.instance.GetTile(cellCubePos);

        if (tile == null)
            return false;

        return tile.Biome != 0; // 0 = UNDISCOVERED
    }

    public void ActivateMovementMode()
    {
        if (isMoving)
            return;

        isMoving = true;
    }

    public void DeactivateMovementMode()
    {
        if (!isMoving)
            return;

        isMoving = false;
        // Path is never null. If this causes trouble with GC then we have to appropriate null checks in the state update handler
        _path = new List<Vector3Int>();
        HideHighlights();
        HidePathHighlights();
    }

    public void HighlightAvailableSpaces()
    {
        HideHighlights();

        if (_path.Count == 0)
            return;

        foreach (Vector3Int space in TileHelper.GetTileNeighbours(_path[_path.Count - 1]))
        {
            if (
                !spawnedPathHighlights.ContainsKey(space)
                && MapInteractionManager.instance.IsDiscoveredTile(space)
            )
            {
                GameObject highlight = Instantiate(greenHighlightPrefab);
                highlight.transform.position = MapManager.instance.grid.CellToWorld(
                    GridExtensions.CubeToGrid(space)
                );
                spawnedValidCellHighlights.Add(space, highlight);
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

    private void AddCellToPath(Vector3Int cellCubePos)
    {
        bool validPosition =
            _path.Count == 0
            || TileHelper.GetTileNeighbours(_path[_path.Count - 1]).Contains(cellCubePos);
        if (!_path.Any(p => p == cellCubePos) && validPosition)
        {
            var tileIDs = _path.Select(cellPosCube => TileHelper.GetTileID(cellPosCube)).ToList();
            tileIDs.Add(TileHelper.GetTileID(cellCubePos));
            PluginController.Instance.SendSetIntentionMsg(INTENTION_MOVE, tileIDs);
        }
    }

    private void RemoveCellFromPath(Vector3Int cellCubePos)
    {
        var pathCount = _path.Count;

        _path.Remove(_path.FirstOrDefault(p => p == cellCubePos));
        var tileIDs = _path.Select(cellPosCube => TileHelper.GetTileID(cellPosCube)).ToList();

        // If we click elsewhere on the map and don't alter the path then don't make a state update
        if (pathCount != _path.Count)
        {
            // Removing the last tile takes stops the move intention
            var intention = tileIDs.Count > 0 ? INTENTION_MOVE : 0;
            PluginController.Instance.SendSetIntentionMsg(intention, tileIDs);
        }
    }

    private void ClosePath(Vector3Int cellCubePos)
    {
        HideHighlights();
        AddCellToPath(cellCubePos);
        HidePathHighlights();
        isMoving = false;
        StartCoroutine(TracePathCR());
    }

    IEnumerator TracePathCR()
    {
        for (int i = 1; i < _path.Count; i++)
        {
            var cellPosCube = _path[i];
            PluginController.Instance.MoveSeeker(SeekerManager.Instance.Seeker, cellPosCube);
            yield return new WaitForSeconds(3.5f);
            if (_travelMarkers.ContainsKey(cellPosCube))
            {
                _travelMarkers[cellPosCube].HideLine();
            }
        }
    }
}
