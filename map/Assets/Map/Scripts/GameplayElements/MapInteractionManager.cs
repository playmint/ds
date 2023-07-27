using Cog;
using UnityEngine;
using System.Collections.Generic;
using System.Linq;
using UnityEngine.EventSystems;
using System;

public class MapInteractionManager : MonoBehaviour
{
    public static MapInteractionManager instance;

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

        string mobileUnitID = "";
        string mapElementID = "";
        if (Physics.Raycast(ray, out hit))
        {
            if (hit.transform.CompareTag("MobileUnit"))
                mobileUnitID = hit.transform.GetComponent<MapElementController>().GetElementID();
            if (hit.transform.CompareTag("Building") || hit.transform.CompareTag("Enemy") || hit.transform.CompareTag("Bag"))
                mapElementID = hit.transform.GetComponent<MapElementController>().GetElementID();

            //Get the point that is clicked
            Vector3 hitPoint = hit.point;
            Vector3Int cubePos = GridExtensions.GridToCube(
                MapManager.instance.grid.WorldToCell(hitPoint)
            );
            CurrentMouseCell = MapManager.instance.grid.WorldToCell(hitPoint);
            Vector3 cursorPos = MapManager.instance.grid.CellToWorld(CurrentMouseCell);
            float height = MapHeightManager.UNSCOUTED_HEIGHT;
            if (MapManager.instance.IsDiscoveredTile(cubePos))
                height = MapHeightManager.instance.GetHeightAtPosition(cursorPos);
            cursor.position = new Vector3(cursorPos.x, height, cursorPos.z);
        }
        if (EventSystem.current.IsPointerOverGameObject())
            return;

        bool TileNeighbourValid = false;
        if (MobileUnitManager.instance.currentSelectedMobileUnit != null)
        {
            Vector3Int cubePos = GridExtensions.GridToCube(CurrentMouseCell);
            Vector3Int[] neighborTiles = TileHelper.GetTileNeighbours(
                TileHelper.GetTilePosCube(
                    MobileUnitManager.instance.currentSelectedMobileUnit.NextLocation
                )
            );
            TileNeighbourValid = neighborTiles.Contains(cubePos);
            if (
                TileNeighbourValid
                && GameStateMediator.Instance.gameState.Selected.Intent != IntentKind.SCOUT
            )
            {
                TileNeighbourValid = MapManager.instance.IsDiscoveredTile(
                    neighborTiles.FirstOrDefault(n => n == cubePos)
                );
            }
        }
        // Tile mouseover cursor
        if (
            GameStateMediator.Instance.gameState != null
            && GameStateMediator.Instance.gameState.World != null
        )
            cursor.gameObject.SetActive(
                (
                    MapManager.instance.IsDiscoveredTile(
                        GridExtensions.GridToCube(CurrentMouseCell)
                    ) || TileNeighbourValid
                ) && String.IsNullOrEmpty(mobileUnitID) && String.IsNullOrEmpty(mapElementID)
            );

        if (Input.GetMouseButtonUp(0))
        {
            if (hit.transform != null)
            {
                if (!_camController.hasDragged)
                    MapClicked(mobileUnitID, mapElementID);
            }
            else
            {
                if (!_camController.hasDragged)
                    DeselectAll();
            }
        }

        if (Input.GetMouseButtonDown(1))
        {
            MapClicked2();
        }
    }

    void MapClicked(string mobileUnitID = "", string mapElementID = "")
    {
        // CurrentMouseCell is using Odd R offset coords
        var cellPosCube = GridExtensions.GridToCube(CurrentMouseCell);
        var tile = MapManager.instance.GetTileByPos(cellPosCube);
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
            if (MapManager.instance.IsDiscoveredTile(cellPosCube))
            { // If it's a discovered tile, select it, if not deselect everything
                Cog.GameStateMediator.Instance.SendSelectTileMsg(new List<string>() { tile.Id });
                if (string.IsNullOrEmpty(mobileUnitID))
                {
                    // If we have a selected unit and we've clicked outside the unit's AOI and we haven't clicked the unit's tile
                    if (
                        GameStateMediator.Instance.gameState.Selected.MobileUnit != null
                        && !TileHelper.GetTileNeighbours(TileHelper.GetTilePosCube(GameStateMediator.Instance.gameState.Selected.MobileUnit.NextLocation)).Contains(cellPosCube)
                        && TileHelper.GetTilePosCube(GameStateMediator.Instance.gameState.Selected.MobileUnit.NextLocation) != cellPosCube
                    )
                    {
                        Cog.GameStateMediator.Instance.SendSelectMobileUnitMsg();
                    }
                }
                else
                {
                    Debug.Log("Select Unit: " + mobileUnitID);
                    Cog.GameStateMediator.Instance.SendSelectMobileUnitMsg(mobileUnitID);
                }

                if (!string.IsNullOrEmpty(mapElementID))
                {

                    Debug.Log("Select Map Element: " + mapElementID);
                    Cog.GameStateMediator.Instance.SendSelectMapElementMsg(mapElementID);
                }
                else
                {
                    Cog.GameStateMediator.Instance.SendSelectMapElementMsg();
                }
            }
            else
                DeselectAll();
        }
        else if (GameStateMediator.Instance.gameState.Selected.Intent != IntentKind.MOVE)
        {
            //if we're in an intent and clicking outside the area of influence, deselect everything (accept for move intent, which handles this itself)
            if (
                GameStateMediator.Instance.gameState.Selected.MobileUnit != null
                && !TileHelper
                    .GetTileNeighbours(
                        TileHelper.GetTilePosCube(
                            GameStateMediator.Instance.gameState.Selected.MobileUnit.NextLocation
                        )
                    )
                    .Contains(cellPosCube)
                && TileHelper.GetTilePosCube(
                    GameStateMediator.Instance.gameState.Selected.MobileUnit.NextLocation
                ) != cellPosCube
            )
            {
                DeselectAll();
            }
        }
    }

    private void DeselectAll()
    {
        GameStateMediator.Instance.SendSelectMobileUnitMsg();
        GameStateMediator.Instance.SendSelectTileMsg(null);
        GameStateMediator.Instance.SendSetIntentMsg(null);
        Cog.GameStateMediator.Instance.SendSelectMapElementMsg();
    }

    public void MapClicked2()
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
        else if (
            state.Selected != null && state.Selected.Tiles != null && state.Selected.Tiles.Count > 0
        )
        {
            var tile = state.Selected.Tiles.First();
            var cellPosCube = TileHelper.GetTilePosCube(tile);
            var gridCoords = GridExtensions.CubeToGrid(cellPosCube);

            CurrentSelectedCell = GridExtensions.CubeToGrid(cellPosCube);
            //clickedPlayerCell = MobileUnitManager.instance.IsPlayerAtPosition(cellPosCube);
            Vector3 markerPos = MapManager.instance.grid.CellToWorld(CurrentSelectedCell);
            float height = MapHeightManager.UNSCOUTED_HEIGHT;
            if (MapManager.instance.IsDiscoveredTile(cellPosCube))
                height = MapHeightManager.instance.GetHeightAtPosition(markerPos);
            selectedMarker1.position = new Vector3(markerPos.x, height, markerPos.z);

            selectedMarker1.gameObject.SetActive(true);
        }
        else
        {
            selectedMarker1.gameObject.SetActive(false);
        }
    }

    public void FocusTile(Vector3Int cubePos)
    {
        _camController.FocusTile(cubePos);
    }

    public void FocusTile(string tileID)
    {
        if (
            GameStateMediator.Instance.gameState == null
            || GameStateMediator.Instance.gameState.World == null
        )
        {
            return;
        }
        _camController.FocusTile(
            TileHelper.GetTilePosCube(
                GameStateMediator.Instance.gameState.World.Tiles.FirstOrDefault(t => t.Id == tileID)
            )
        );
    }
}
