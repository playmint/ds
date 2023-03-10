using Cog;
using UnityEngine;
using Nethereum.Contracts;
using Nethereum.Hex.HexConvertors.Extensions;
using System.Collections.Generic;
using System.Linq;
using UnityEngine.EventSystems;

public class MapInteractionManager : MonoBehaviour
{
    public static MapInteractionManager instance;
    public bool IsTileSelected;
    public static Vector3Int CurrentSelectedCell; // Offset odd r coords
    public static Vector3Int CurrentMouseCell; // Offset odd r coords
    public TravelMarkerController travelMarkerController;

    private Vector3Int _destinationPosCube;

    [SerializeField]
    Transform cursor,
        selectedMarker1;

    Vector3Int selectedCellPos;

    Plane m_Plane;

    bool validPosition;

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
            validPosition =
                !MapManager.isMakingMove
                || (
                    IsDiscoveredTile(cubePos)
                        && TileHelper.GetTileNeighbours(selectedCellPos).Contains(cubePos)
                    || cubePos == selectedCellPos
                );
            if (validPosition)
            {
                CurrentMouseCell = MapManager.instance.grid.WorldToCell(hitPoint);
                cursor.position = MapManager.instance.grid.CellToWorld(
                    MapManager.instance.grid.WorldToCell(hitPoint)
                );
            }
        }
        if (EventSystem.current.IsPointerOverGameObject())
            return;
        if (Input.GetMouseButtonDown(0))
        {
            MapClicked();
        }
        if (Input.GetMouseButtonUp(0))
        {
            if (MapManager.isMakingMove)
            {
                var destPos = GridExtensions.GridToCube(CurrentMouseCell);
                if (
                    validPosition
                    && IsDiscoveredTile(destPos)
                    && !SeekerManager.Instance.IsPlayerAtPosition(destPos)
                )
                {
                    _destinationPosCube = destPos;
                    MoveSeeker(SeekerManager.Instance.Seeker, destPos);
                }
                else
                {
                    selectedMarker1.gameObject.SetActive(true);
                    travelMarkerController.HideLine();
                }
            }
            MapManager.isMakingMove = false;
        }
        if (Input.GetMouseButtonDown(1))
        {
            MapClicked2();
        }
        if(SeekerManager.Instance.Seeker != null)
        cursor.gameObject.SetActive(IsDiscoveredTile(GridExtensions.GridToCube(CurrentMouseCell)) || TileHelper.GetTileNeighbours(TileHelper.GetTilePosCube(SeekerManager.Instance.Seeker.Location[1].Tile)).Contains(GridExtensions.GridToCube(CurrentMouseCell)));
    }

    void MapClicked()
    {
        // CurrentMouseCell is using Odd R offset coords
        var cellPosCube = GridExtensions.GridToCube(CurrentMouseCell);
        var tile = GetTile(cellPosCube);
        if (tile == null)
            return;

        selectedCellPos = cellPosCube;

        bool isPlayerAtPosition = SeekerManager.Instance.IsPlayerAtPosition(cellPosCube);
        if (isPlayerAtPosition)
        {
            MapManager.isMakingMove = true;
        }

        // Select the tile
        Cog.PluginController.Instance.SendSelectTileMsg(new List<string>() { tile.Id });
    }

    void MapClicked2()
    {
        var cellPosOddR = MapManager.instance.grid.WorldToCell(cursor.position);
        var cellPosCube = GridExtensions.GridToCube(cellPosOddR);

        // --  Debug

        if (SeekerManager.Instance.Seeker != null)
        {
            // function SCOUT_SEEKER(uint32 sid, int16 q, int16 r, int16 s) external;
            Cog.PluginController.Instance.DispatchAction(
                "SCOUT_SEEKER",
                "0x" + SeekerManager.Instance.Seeker.Key,
                cellPosCube.x,
                cellPosCube.y,
                cellPosCube.z
            );
        }
    }

    private void MoveSeeker(Seeker seeker, Vector3Int cellPosCube)
    {
        // function MOVE_SEEKER(uint32 sid, int16 q, int16 r, int16 s) external;
        Cog.PluginController.Instance.DispatchAction(
            "MOVE_SEEKER",
            "0x" + SeekerManager.Instance.Seeker.Key,
            cellPosCube.x,
            cellPosCube.y,
            cellPosCube.z
        );
    }

    // -- TODO: Obviously this won't scale, need to hold tiles in a dictionary
    public bool IsDiscoveredTile(Vector3Int cellPosCube)
    {
        if (Cog.PluginController.Instance.WorldState != null)
        {
            foreach (var tile in Cog.PluginController.Instance.WorldState.Game.Tiles)
            {
                if (TileHelper.GetTilePosCube(tile) == cellPosCube && tile.Biome != 0)
                    return true;
            }
        }

        return false;
    }

    private Tile GetTile(Vector3Int cellPosCube)
    {
        if (Cog.PluginController.Instance.WorldState == null)
        {
            return null;
        }

        return Cog.PluginController.Instance.WorldState.Game.Tiles
            .ToList()
            .Find(tile => TileHelper.GetTilePosCube(tile) == cellPosCube);
    }

    // -- LISTENERS

    private void OnStateUpdated(State state)
    {
        if (state.UI.Selection.Tiles != null && state.UI.Selection.Tiles.Count > 0)
        {
            var tile = state.UI.Selection.Tiles.ToList()[0];
            var cellPosCube = TileHelper.GetTilePosCube(tile);
            var gridCoords = GridExtensions.CubeToGrid(cellPosCube);
            if (!IsTileSelected || CurrentSelectedCell != gridCoords)
            {
                OnTileSelected(cellPosCube);
            }
        }
        else
        {
            IsTileSelected = false;
            MapManager.isMakingMove = false;
        }

        var playerSeekers = state.UI.Selection.Player?.Seekers.ToList();
        if (
            playerSeekers != null
            && playerSeekers.Count > 0
            && isSeekerAtLocation(playerSeekers[0], _destinationPosCube)
        )
        {
            travelMarkerController.HideLine();
        }
    }

    private bool isSeekerAtLocation(Seeker seeker, Vector3Int cellPosCube)
    {
        return TileHelper.GetTilePosCube(seeker.Location.Next.Tile) == cellPosCube;
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
