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
    Transform cursor,
        selectedMarker1;

    Plane m_Plane;

    private void Awake()
    {
        instance = this;
    }

    private void Start()
    {
        m_Plane = new Plane(Vector3.forward, 0);
        Cog.PluginController.Instance.EventStateUpdated += OnStateUpdated;

        selectedMarker1.gameObject.SetActive(false);
    }

    private void Update()
    {
        Ray ray = Camera.main.ScreenPointToRay(Input.mousePosition);

        //Initialise the enter variable
        float enter = 0.0f;

        if (m_Plane.Raycast(ray, out enter))
        {
            //Get the point that is clicked
            Vector3 hitPoint = ray.GetPoint(enter);
            Vector3Int cubePos = GridExtensions.GridToCube(
                MapManager.instance.grid.WorldToCell(hitPoint)
            );
            CurrentMouseCell = MapManager.instance.grid.WorldToCell(hitPoint);
            cursor.position = MapManager.instance.grid.CellToWorld(
                MapManager.instance.grid.WorldToCell(hitPoint)
            );
        }
        if (EventSystem.current.IsPointerOverGameObject())
            return;
        if (Input.GetMouseButtonDown(0))
        {
            MapClicked();
        }

        if (Input.GetMouseButtonDown(1))
        {
            MapClicked2();
        }

        // Tile mouseover cursor
        if (
            SeekerManager.Instance.Seeker != null
            && PluginController.Instance.WorldState.World != null
        )
            cursor.gameObject.SetActive(
                IsDiscoveredTile(GridExtensions.GridToCube(CurrentMouseCell))
                    || TileHelper
                        .GetTileNeighbours(
                            TileHelper.GetTilePosCube(SeekerManager.Instance.Seeker.NextLocation)
                        )
                        .Contains(GridExtensions.GridToCube(CurrentMouseCell))
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

        // Select the tile
        if (
            PluginController.Instance.WorldState.Selected.Intent == null
            || PluginController.Instance.WorldState.Selected.Intent == Intent.NONE
        )
        {
            Cog.PluginController.Instance.SendSelectTileMsg(new List<string>() { tile.Id });
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

    // -- TODO: Obviously this won't scale, need to hold tiles in a dictionary
    public bool IsDiscoveredTile(Vector3Int cellPosCube)
    {
        var tile = TileHelper.GetTileByPos(cellPosCube);
        return tile != null && tile.Biome != 0;
    }

    // -- LISTENERS

    private void OnStateUpdated(State state)
    {
        if (state.Selected.Tiles != null && state.Selected.Tiles.Count > 0)
        {
            var tile = state.Selected.Tiles.ToList()[0];
            var cellPosCube = TileHelper.GetTilePosCube(tile);
            var gridCoords = GridExtensions.CubeToGrid(cellPosCube);

            CurrentSelectedCell = GridExtensions.CubeToGrid(cellPosCube);
            clickedPlayerCell = SeekerManager.Instance.IsPlayerAtPosition(cellPosCube);

            selectedMarker1.position = MapManager.instance.grid.CellToWorld(CurrentSelectedCell);

            selectedMarker1.gameObject.SetActive(true);
        }
    }

    private bool isSeekerAtLocation(Seeker seeker, Vector3Int cellPosCube)
    {
        return TileHelper.GetTilePosCube(seeker.NextLocation) == cellPosCube;
    }

    private void OnTileSelected(Vector3Int cellPosCube)
    {
        IsTileSelected = true;
        CurrentSelectedCell = GridExtensions.CubeToGrid(cellPosCube);

        // Show tile selector
        selectedMarker1.gameObject.SetActive(true);
        selectedMarker1.position = MapManager.instance.grid.CellToWorld(CurrentSelectedCell);
    }
}
