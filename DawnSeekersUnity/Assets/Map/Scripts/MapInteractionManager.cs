using Cog.GraphQL;
using UnityEngine;
using Nethereum.Contracts;
using Nethereum.Hex.HexConvertors.Extensions;
using System.Collections.Generic;
using System.Linq;

public class MapInteractionManager : MonoBehaviour
{
    public static Vector3Int CurrentSelectedCell; // Offset odd r coords
    public static Vector3Int CurrentMouseCell; // Offset odd r coords

    [SerializeField]
    Transform cursor,selectedMarker1,selectedMarker2;

    Plane m_Plane;

    private bool _hasStateUpdated;

    private void Start()
    {
        m_Plane = new Plane(Vector3.forward,0);

        Cog.PluginController.Instance.EventTileInteraction += OnTileInteraction;
        Cog.PluginController.Instance.EventStateUpdated += OnStateUpdated;
        if (Cog.PluginController.Instance.WorldState != null) 
        {
            OnStateUpdated(Cog.PluginController.Instance.WorldState);
        }

        selectedMarker1.gameObject.SetActive(false);
        selectedMarker2.gameObject.SetActive(false);
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

            CurrentMouseCell = MapManager.instance.grid.WorldToCell(hitPoint);
            cursor.position = MapManager.instance.grid.CellToWorld(MapManager.instance.grid.WorldToCell(hitPoint));
        }
        if (Input.GetMouseButtonDown(0))
        {
            MapClicked();
        }
        if (Input.GetMouseButtonDown(1))
        {
            MapClicked2();
        }

        // As state events occur on a separate thread, the tilemap cannot be updated as a side effect
        // of the event therefore the event will set a flag and then visual state update happens as part of the main thread
        if (_hasStateUpdated) 
        {
            Debug.Log("State Update");
            RenderState(Cog.PluginController.Instance.WorldState);
            _hasStateUpdated = false;
        }
    }

    void RenderState(State state) 
    {
        Debug.Log("Rending new state");
        IconManager.instance.ResetSeekerPositionCounts();
        MapManager.instance.ClearMap();
        foreach (var tile in state.Tiles)
        {
            if (tile.Biome != null)
            {
                var hasResource = TileHelper.HasResource(tile);
                var cellPosCube = TileHelper.GetTilePosCube(tile);
                var cell = new MapManager.MapCell {
                    cubicCoords = cellPosCube, 
                    typeID = 0, 
                    iconID = 0,
                    cellName = ""
                };
                if(hasResource)
                    IconManager.instance.CreateBuildingIcon(tile, cell);
                MapManager.instance.AddTile(cell);
            }
        }
        var playerSeekerTilePos = new List<Vector3Int>();

        foreach(var building in state.Buildings)
        {
            var cellPosCube = TileHelper.GetTilePosCube(building.Location.Tile);
            var cell = new MapManager.MapCell {
                cubicCoords = cellPosCube, 
                typeID = 0, // TODO: I presume this might have to be linked to buildings? 
                iconID = 0, // TODO: I presume this might have to be linked to buildings?
                cellName = ""
            };
            IconManager.instance.CreateBuildingIcon(building.Location.Tile, cell);
        }

        foreach(var seeker in state.Seekers) 
        {
            // index 1 is destination location
            var cellPosCube = TileHelper.GetTilePosCube(seeker.Location[1].Tile);

            var isPlayerSeeker = (SeekerManager.Instance.Seeker != null && SeekerManager.Instance.Seeker.SeekerID == seeker.SeekerID);

            var cell = new MapManager.MapCell
            {
                cubicCoords = cellPosCube,
                typeID = 2,
                iconID = 0,
                cellName = "Player Seeker"
            };

            if (isPlayerSeeker)
            {
                // Render in next pass
                playerSeekerTilePos.Add(cellPosCube);
                foreach(Vector3Int neighbour in TileHelper.GetTileNeighbours(cellPosCube))
                {
                    var neighbourCell = new MapManager.MapCell
                    {
                        cubicCoords = neighbour,
                        typeID = 1,
                        iconID = 0,
                        cellName = ""
                    };
                    if (!MapManager.instance.IsTileAtPosition(neighbour))
                        MapManager.instance.AddTile(neighbourCell);
                }
            }
            else
            {
                cell.typeID = 3;
            }
            IconManager.instance.CreateSeekerIcon(seeker, cell, isPlayerSeeker, state.Seekers.Where(n=> TileHelper.GetTilePosCube(n.Location[1].Tile) == cellPosCube).Count());
        }
    }

    void MapClicked()
    {
        // CurrentMouseCell is using Odd R offset coords
        var cellPosCube = GridExtensions.GridToCube(CurrentMouseCell);
        Cog.PluginController.Instance.SendTileInteractionMsg(cellPosCube);
    }

    void MapClicked2()
    {
        var cellPosOddR = MapManager.instance.grid.WorldToCell(cursor.position);
        var cellPosCube = GridExtensions.GridToCube(cellPosOddR);

        // --  Debug

        if (SeekerManager.Instance.Seeker != null)
        {
            var action = new Cog.Actions.ScoutSeekerAction(
                SeekerManager.Instance.Seeker.SeekerID,
                cellPosCube.x,
                cellPosCube.y,
                cellPosCube.z
            );
            Cog.PluginController.Instance.DispatchAction(action.GetCallData());
        }
    }

    private void MoveSeeker(Seeker seeker, Vector3Int cellPosCube)
    {
        var action = new Cog.Actions.MoveSeekerAction(
            seeker.SeekerID,
            cellPosCube.x,
            cellPosCube.y,
            cellPosCube.z
        );

        Cog.PluginController.Instance.DispatchAction(action.GetCallData());
    }

    // -- TODO: Obviously this won't scale, need to hold tiles in a dictionary  
    private bool IsDiscoveredTile(Vector3Int cellPosCube)
    {
        if (Cog.PluginController.Instance.WorldState != null)
        {
            foreach(var tile in Cog.PluginController.Instance.WorldState.Tiles)
            {
                if (TileHelper.GetTilePosCube(tile) == cellPosCube) return true;
            }
        }

        return false;
    }

    // -- LISTENERS

    private void OnTileInteraction(Vector3Int cellPosCube)
    {
        // -- Can't select an undiscovered tile. We might need to for scouting in the future?
        if (!IsDiscoveredTile(cellPosCube)) return;

        CurrentSelectedCell = GridExtensions.CubeToGrid(cellPosCube);

        bool isPlayerAtPosition = SeekerManager.Instance.IsPlayerAtPosition(cellPosCube);
        if (isPlayerAtPosition)
        {
            if (MapManager.isMakingMove)
            {
                // Seeker already selected so deselect
                MapManager.isMakingMove = false;

                selectedMarker1.gameObject.SetActive(true);
                selectedMarker2.gameObject.SetActive(false);
            }
            else
            {
                // Select the seeker
                MapManager.isMakingMove = true;

                selectedMarker1.gameObject.SetActive(true);
                selectedMarker2.gameObject.SetActive(false);

                selectedMarker1.position = MapManager.instance.grid.CellToWorld(CurrentSelectedCell);
            }
        }
        else
        {
            // If a seeker is selected then show the destination selection
            if (MapManager.isMakingMove && SeekerManager.Instance.Seeker != null)
            {
                // TODO: Show Marker 2 until the move has completed
                // selectedMarker2.gameObject.SetActive(true);
                // selectedMarker2.position = MapManager.instance.grid.CellToWorld(CurrentSelectedCell);
                selectedMarker1.gameObject.SetActive(false);

                MapManager.isMakingMove = false;

                MoveSeeker(SeekerManager.Instance.Seeker, cellPosCube);
            } 
            else
            {
                selectedMarker1.gameObject.SetActive(true);
                selectedMarker2.gameObject.SetActive(false);

                selectedMarker1.position = MapManager.instance.grid.CellToWorld(CurrentSelectedCell);
            }
        }
    }

    private void OnStateUpdated(State state)
    {
        _hasStateUpdated = true;        
    }
}
