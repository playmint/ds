using Cog;
using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using UnityEngine.EventSystems;
using System;

public class MapInteractionManager : MonoBehaviour
{
    public static MapInteractionManager instance;
    public static bool clickedPlayerCell;
    public bool IsTileSelected;
    public static Vector3Int CurrentSelectedCell; // Offset odd r coords
    public static Vector3Int CurrentMouseCell; // Offset odd r coords

    public Action<Vector3Int> EventTileLeftClick;
    public Action<Vector3Int> EventTileRightClick;

    [SerializeField]
    LayerMask tileLayer;

    [SerializeField]
    Transform cursor,
        selectedMarker1;

    [SerializeField]
    private GameObject _intentContainerGO;

    [SerializeField]
    private CameraController _camController;

    bool mapReady = false;

    private void Awake()
    {
        instance = this;
    }

    private void Start()
    {
        Cog.GameStateMediator.Instance.EventStateUpdated += OnStateUpdated;

        selectedMarker1.gameObject.SetActive(false);
    }

    private void Update()
    {
        if (!mapReady)
            return;
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);

        RaycastHit hit;

        if (Physics.Raycast(ray, out hit))
        {
            //Get the point that is clicked
            Vector3 hitPoint = hit.point;
            Vector3Int cubePos = GridExtensions.GridToCube(
                MapManager.instance.grid.WorldToCell(hitPoint)
            );
            CurrentMouseCell = MapManager.instance.grid.WorldToCell(hitPoint);
            Vector3 cursorPos = MapManager.instance.grid.CellToWorld(CurrentMouseCell);
            float height = MapHeightManager.UNSCOUTED_HEIGHT;
            if (TileHelper.IsDiscoveredTile(cubePos))
                height = MapHeightManager.instance.GetHeightAtPosition(cursorPos);
            cursor.position = new Vector3(cursorPos.x, cursorPos.y, height);
        }
        if (EventSystem.current.IsPointerOverGameObject())
            return;
        if (Input.GetMouseButtonUp(0))
        {
            if (!_camController.hasDragged)
                MapClicked();
        }

        if (Input.GetMouseButtonDown(1))
        {
            MapClicked2();
        }

        bool TileNeighbourValid = false;
        if (SeekerManager.instance.Seeker != null)
            TileNeighbourValid = TileHelper
                .GetTileNeighbours(
                    TileHelper.GetTilePosCube(SeekerManager.instance.Seeker.NextLocation)
                )
                .Contains(GridExtensions.GridToCube(CurrentMouseCell));

        // Tile mouseover cursor
        if (
            GameStateMediator.Instance.gameState != null
            && GameStateMediator.Instance.gameState.World != null
        )
            cursor.gameObject.SetActive(
                TileHelper.IsDiscoveredTile(GridExtensions.GridToCube(CurrentMouseCell))
                    || TileNeighbourValid
            );
    }

    void MapClicked()
    {
        // CurrentMouseCell is using Odd R offset coords
        var cellPosCube = GridExtensions.GridToCube(CurrentMouseCell);
        var tile = TileHelper.GetTileByPos(cellPosCube);
        if (tile == null)
            return;

        if (EventTileLeftClick != null)
        {
            EventTileLeftClick(cellPosCube);
        }

        // Do generic selection of tile if we aren't in any of our handled intents
        if (
            !IntentManager.Instance.IsHandledIntent(
                GameStateMediator.Instance.gameState.Selected.Intent
            )
        )
        {
            Cog.GameStateMediator.Instance.SendSelectTileMsg(new List<string>() { tile.Id });
        }
    }

    void MapClicked2()
    {
        var cellPosOddR = MapManager.instance.grid.WorldToCell(cursor.position);
        var cellPosCube = GridExtensions.GridToCube(cellPosOddR);

        if (EventTileRightClick != null)
        {
            EventTileRightClick(cellPosCube);
        }
    }

    // -- LISTENERS

    private void OnStateUpdated(GameState state)
    {
        mapReady = true;
        if (
            IntentManager.Instance.IsHandledIntent(
                GameStateMediator.Instance.gameState.Selected.Intent
            )
        )
        {
            selectedMarker1.gameObject.SetActive(false);
        }
        else if (state.Selected.Tiles != null && state.Selected.Tiles.Count > 0)
        {
            var tile = state.Selected.Tiles.First();
            var cellPosCube = TileHelper.GetTilePosCube(tile);
            var gridCoords = GridExtensions.CubeToGrid(cellPosCube);

            CurrentSelectedCell = GridExtensions.CubeToGrid(cellPosCube);
            clickedPlayerCell = SeekerManager.instance.IsPlayerAtPosition(cellPosCube);
            Vector3 markerPos = MapManager.instance.grid.CellToWorld(CurrentSelectedCell);
            float height = MapHeightManager.UNSCOUTED_HEIGHT;
            if (TileHelper.IsDiscoveredTile(cellPosCube))
                height = MapHeightManager.instance.GetHeightAtPosition(markerPos);
            selectedMarker1.position = new Vector3(markerPos.x, markerPos.y, height);

            selectedMarker1.gameObject.SetActive(true);
        }
        else
        {
            selectedMarker1.gameObject.SetActive(false);
        }
    }
}
