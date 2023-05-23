using Cog;
using UnityEngine;
using System.Linq;
using System.Collections.Generic;

public class SeekerManager : MonoBehaviour
{
    public static SeekerManager instance;

    public Seekers Seeker { get; private set; }
    private ICollection<Seekers> _playerSeekers;

    [SerializeField]
    private GameObject seekerPrefab;

    private Dictionary<Vector3Int, int> seekerPositionCounts = new Dictionary<Vector3Int, int>();
    private Dictionary<string, SeekerController> spawnedSeekers =
        new Dictionary<string, SeekerController>();

    protected void Awake()
    {
        instance = this;
        ResetSeekerPositionCounts();
    }

    protected void Start()
    {
        MapManager.MapUpdated += OnStateUpdated;
        if (Cog.GameStateMediator.Instance.gameState != null)
        {
            OnStateUpdated(Cog.GameStateMediator.Instance.gameState);
        }
    }

    public bool IsPlayerAtPosition(Vector3Int cellPosCube)
    {
        if (Seeker == null)
            return false;

        return TileHelper.GetTilePosCube(Seeker.NextLocation) == cellPosCube;
    }

    // -- LISTENERS

    // TODO: Still assuming only one seeker
    private void OnStateUpdated(GameState state)
    {
        ResetSeekerPositionCounts();

        var selectedSeeker = state.Selected.Seeker;

        //  If we've switched accounts, remove all seekers to reset
        if (
            (selectedSeeker != null && Seeker != null && selectedSeeker.Id != Seeker.Id)
            || (Seeker == null && selectedSeeker != null)
            || (Seeker != null && selectedSeeker == null)
        )
        {
            instance.RemoveAllSeekers();
            Seeker = null;
        }

        _playerSeekers = state.Player.Seekers;

        

        if (state.World != null)
        {
            foreach (var tile in state.World.Tiles)
            {
                var cellPosCube = TileHelper.GetTilePosCube(tile);
                // Seekers
                foreach (var seeker in tile.Seekers)
                {
                    if (!SeekerHelper.IsPlayerSeeker(seeker))
                    {
                        SeekerManager.instance.CreateSeeker(
                            seeker.Id,
                            cellPosCube,
                            false,
                            tile.Seekers.Count
                        );
                    }
                    else
                    {
                        var seekerPosCube = TileHelper.GetTilePosCube(seeker.NextLocation);
                        //var seekerTile = TileHelper.GetTileByPos(seekerPosCube);

                        SeekerManager.instance.CreateSeeker(
                            seeker.Id,
                            seekerPosCube,
                            true,
                            tile.Seekers.Count
                        );
                    }
                }
            }
        }

        if (selectedSeeker != null)
        {
            var selectedSeekers = _playerSeekers.Where(s => s.Id == selectedSeeker.Id);
            if (selectedSeekers.Count() > 0)
            {
                Seeker = selectedSeekers.First();
                //createSeeker(true);
            }
        }
    }

    public void RemoveAllSeekers()
    {
        var allSeekers = spawnedSeekers.ToDictionary(pair => pair.Key, pair => pair.Value);
        foreach (KeyValuePair<string, SeekerController> seeker in allSeekers)
        {
            seeker.Value.DestroyMapElement();
            spawnedSeekers.Remove(seeker.Key);
        }
    }

    public void RemoveSeekers(List<Cog.Seekers> seekers)
    {
        var filteredDictionary = spawnedSeekers
            .Where(pair => seekers.Any(s => s.Id == pair.Key))
            .ToDictionary(pair => pair.Key, pair => pair.Value);
        foreach (KeyValuePair<string, SeekerController> seeker in filteredDictionary)
        {
            seeker.Value.DestroyMapElement();
            spawnedSeekers.Remove(seeker.Key);
        }
    }

    public void RemoveSeeker(Cog.Seekers seeker)
    {
        if (spawnedSeekers.ContainsKey(seeker.Id))
        {
            spawnedSeekers[seeker.Id].DestroyMapElement();
            spawnedSeekers.Remove(seeker.Id);
        }
    }

    //private void createSeeker(bool isPlayerSeeker)
    //{
    //    var seekerPosCube = TileHelper.GetTilePosCube(Seeker.NextLocation);
    //    var seekerTile = TileHelper.GetTileByPos(seekerPosCube);

    //    SeekerManager.instance.CreateSeeker(
    //        Seeker.Id,
    //        seekerPosCube,
    //        isPlayerSeeker,
    //        seekerTile.Seekers.Count
    //    );
    //}

    public void CreateSeeker(string seekerId, Vector3Int cell, bool isPlayer, int numSeekersAtPos)
    {
        IncreaseSeekerPositionCount(cell);

        numSeekersAtPos = Mathf.Max(numSeekersAtPos, seekerPositionCounts[cell]);
        int buildingOnCell = MapElementManager.instance.IsElementAtCell(cell);
        int index = seekerPositionCounts[cell] - 1;

        if (!spawnedSeekers.ContainsKey(seekerId))
        {
            SeekerController controller;

            if (isPlayer)
                controller = Instantiate(seekerPrefab).GetComponent<SeekerController>();
            else
                controller = Instantiate(seekerPrefab).GetComponent<SeekerController>();

            controller.Setup(cell, numSeekersAtPos + buildingOnCell, index, isPlayer, seekerId);
            spawnedSeekers.Add(seekerId, controller);
        }
        else
        {
            spawnedSeekers[seekerId].CheckPosition(
                cell,
                numSeekersAtPos + buildingOnCell,
                index,
                isPlayer
            );
        }
    }

    public void ResetSeekerPositionCounts()
    {
        seekerPositionCounts = new Dictionary<Vector3Int, int>();
    }

    public void IncreaseSeekerPositionCount(Vector3Int cell)
    {
        if (!seekerPositionCounts.ContainsKey(cell))
            seekerPositionCounts.Add(cell, 1);
        else
            seekerPositionCounts[cell]++;
    }
}
