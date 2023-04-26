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
        if (state.Player == null || state.Player.Seekers == null || state.Player.Seekers.Count == 0)
        {
            // if there were _playerSeekers then we have signed out
            if (_playerSeekers != null)
            {
                // Removed seekers for previous signed in account and add back as non-player seekers
                instance.RemoveSeekers(_playerSeekers.ToList());
                createSeekers(_playerSeekers.ToList(), false);

                _playerSeekers = null;
                Seeker = null;
            }
            return;
        }

        var playerSeeker = state.Player.Seekers.ToList()[0];

        //  If we've switched accounts;
        if (
            playerSeeker != null
            && Seeker != null
            && playerSeeker.Id != Seeker.Id
            && _playerSeekers != null
        )
        {
            // Removed seekers for previous signed in account and add back as non-player seekers
            instance.RemoveSeekers(_playerSeekers.ToList());
            createSeekers(_playerSeekers.ToList(), false);

            // Remove seeker icon for current account as it'll be the dark version
            instance.RemoveSeeker(playerSeeker);
        }

        _playerSeekers = state.Player.Seekers;

        Seeker = playerSeeker;
        createSeeker(true);

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
            }
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

    private void createSeekers(List<Seekers> seekers, bool isPlayerSeeker)
    {
        foreach (var seeker in seekers)
        {
            createSeeker(isPlayerSeeker);
        }
    }

    private void createSeeker(bool isPlayerSeeker)
    {
        var seekerPosCube = TileHelper.GetTilePosCube(Seeker.NextLocation);
        var seekerTile = TileHelper.GetTileByPos(seekerPosCube);

        SeekerManager.instance.CreateSeeker(
            Seeker.Id,
            seekerPosCube,
            isPlayerSeeker,
            seekerTile.Seekers.Count
        );
    }

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

            controller.Setup(cell, numSeekersAtPos + buildingOnCell, index, isPlayer);
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
