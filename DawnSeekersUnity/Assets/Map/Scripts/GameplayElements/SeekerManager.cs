using Cog;
using UnityEngine;
using System.Linq;
using System.Collections.Generic;
using System.Collections;

public class SeekerManager : MonoBehaviour
{
    public static SeekerManager instance;

    public Seeker currentSelectedSeeker { get; private set; }
    private ICollection<Seekers> _playerSeekers;

    [SerializeField]
    private GameObject seekerPrefab;

    private Player currentPlayer;

    private Dictionary<Vector3Int, int> seekerPositionCounts = new Dictionary<Vector3Int, int>();
    private Dictionary<string, SeekerController> spawnedSeekers =
        new Dictionary<string, SeekerController>();

    private int interruptCount = 0;
    private bool _isUpdating;
    private float _chunkMultiplier = 0.1f; //What percentage of seekers to handle per frame

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

    private void OnDestroy()
    {
        MapManager.MapUpdated -= OnStateUpdated;
    }

    // -- LISTENERS

    private void OnStateUpdated(Cog.GameState state)
    {
        // If we get another state update while still updating the previous one,
        // interrupt it and increase the number of tiles processed per chunk to catch up:
        if (_isUpdating)
        {
            Debug.Log("Mobile Unit Update Interrupted");
            interruptCount++;
            StopAllCoroutines();
        }
        StartCoroutine(OnStateUpdatedCR(state));
    }

    // TODO: Still assuming only one seeker
    private IEnumerator OnStateUpdatedCR(GameState state)
    {
        _isUpdating = true;
        int counter = 0;
        int tileChunks = Mathf.CeilToInt(
            state.World.Tiles.Count
                * (_chunkMultiplier + ((float)interruptCount * _chunkMultiplier))
        );

        ResetSeekerPositionCounts();

        var player = state.Player;

        //  If we've switched accounts, remove all seekers to reset
        if (
            (player != null && currentPlayer != null && currentPlayer.Id != player.Id)
            || (currentPlayer == null && player != null)
            || (currentPlayer != null && player == null)
        )
        {
            instance.RemoveAllSeekers();
            currentSelectedSeeker = null;
            currentPlayer = player;
        }
        if (_playerSeekers == null)
            yield return new WaitForSeconds(1f); // wait on first load to separate seeker loading from tile loading.

        _playerSeekers = state.Player.Seekers;

        if (state.World != null)
        {
            var playerSeekers = new Dictionary<Seekers3, Vector3Int>();
            var tileSeekerCount = new Dictionary<Vector3Int, int>();
            foreach (var tile in state.World.Tiles)
            {
                var cellPosCube = TileHelper.GetTilePosCube(tile);
                // Seekers
                foreach (var seeker in tile.Seekers)
                {
                    if (SeekerHelper.IsPlayerSeeker(seeker))
                    {
                        var seekerPosCube = TileHelper.GetTilePosCube(seeker.NextLocation);
                        SeekerManager.instance.CreateSeeker(
                            _playerSeekers.ToList()[0].Id,
                            seekerPosCube,
                            true,
                            tile.Seekers.Count
                        );
                    }
                    else
                    {
                        playerSeekers.Add(seeker, cellPosCube);
                    }
                    counter++;
                    if (counter % tileChunks == 0)
                        yield return null;
                }
                if (tile.Seekers.Count > 0)
                    tileSeekerCount.Add(cellPosCube, tile.Seekers.Count);
            }
            foreach (var seeker in playerSeekers)
            {
                if (!SeekerHelper.IsPlayerSeeker(seeker.Key))
                {
                    SeekerManager.instance.CreateSeeker(
                        seeker.Key.Id,
                        seeker.Value,
                        false,
                        tileSeekerCount[seeker.Value]
                    );
                }
            }
        }

        currentSelectedSeeker = state.Selected.Seeker;

        _isUpdating = false;
        interruptCount = 0;
    }

    public bool IsPlayerSeeker(string seekerID)
    {
        if (_playerSeekers == null)
        {
            return false;
        }
        return _playerSeekers.Any(s => s.Id == seekerID);
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

    public SeekerController GetSeekerController()
    {
        return spawnedSeekers[currentSelectedSeeker.Id];
    }
}
