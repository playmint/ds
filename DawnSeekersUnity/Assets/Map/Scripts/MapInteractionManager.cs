using Cog.GraphQL;
using UnityEngine;
using UnityEngine.Tilemaps;
using Nethereum.Contracts;

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
        foreach(var tile in state.Tiles)
        {
            var cellPosCube = TileHelper.GetTilePosCube(tile);
            var cell = new MapManager.MapCell {
                cubicCoords = cellPosCube, 
                typeID = 0, 
                iconID = 0,
                cellName = ""
            };

            MapManager.instance.AddTile(cell);
        }

        foreach(var seeker in state.Seekers) 
        {
            var q = System.Convert.ToInt16(seeker.Location[1].Tile.Coords[1], 16);
            var r = System.Convert.ToInt16(seeker.Location[1].Tile.Coords[2], 16);
            var s = System.Convert.ToInt16(seeker.Location[1].Tile.Coords[3], 16);

            var cellPosCube = new Vector3Int(q,r,s);
            // var cellPosOddR = grid.CubeToGrid(cellPosCube);

            var isPlayerSeeker = (SeekerManager.Instance.Seeker != null && SeekerManager.Instance.Seeker.SeekerID == seeker.SeekerID);
            var cell = new MapManager.MapCell {
                cubicCoords = cellPosCube, 
                typeID = isPlayerSeeker? 2 : 3, 
                iconID = 0,
                cellName = "Seeker"
            };

            MapManager.instance.AddTile(cell);
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
            var action = new Cog.Actions.DevSpawnTileAction(
                1,
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
