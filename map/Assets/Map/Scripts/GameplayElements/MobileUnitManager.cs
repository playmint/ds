using Cog;
using UnityEngine;
using System.Linq;
using System.Collections.Generic;
using System.Collections;

public class MobileUnitManager : MonoBehaviour
{
    public static MobileUnitManager instance;

    public MobileUnit currentSelectedMobileUnit { get; private set; }
    private ICollection<MobileUnits> _playerMobileUnits;

    [SerializeField]
    private GameObject mobileUnitPrefab;

    private ConnectedPlayer currentPlayer;

    private Dictionary<Vector3Int, int> mobileUnitPositionCounts =
        new Dictionary<Vector3Int, int>();
    private Dictionary<string, MobileUnitController> spawnedMobileUnits =
        new Dictionary<string, MobileUnitController>();

    private int interruptCount = 0;
    private bool _isUpdating;
    private float _chunkMultiplier = 0.1f; //What percentage of mobileUnits to handle per frame

    protected void Awake()
    {
        instance = this;
        ResetMobileUnitPositionCounts();
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

    // TODO: Still assuming only one mobileUnit
    private IEnumerator OnStateUpdatedCR(GameState state)
    {
        _isUpdating = true;
        int counter = 0;
        int tileChunks = Mathf.CeilToInt(
            state.World.Tiles.Count
                * (_chunkMultiplier + ((float)interruptCount * _chunkMultiplier))
        );

        ResetMobileUnitPositionCounts();

        var player = state.Player;

        //  If we've switched accounts, remove all mobileUnits to reset
        if (
            (player != null && currentPlayer != null && currentPlayer.Id != player.Id)
            || (currentPlayer == null && player != null)
            || (currentPlayer != null && player == null)
        )
        {
            instance.RemoveAllMobileUnits();
            currentSelectedMobileUnit = null;
            currentPlayer = player;
        }
        if (_playerMobileUnits == null)
            yield return new WaitForSeconds(1f); // wait on first load to separate mobileUnit loading from tile loading.

        _playerMobileUnits = state.Player.MobileUnits;

        if (state.World != null)
        {
            var playerMobileUnits = new Dictionary<MobileUnits3, Vector3Int>();
            var tileMobileUnitCount = new Dictionary<Vector3Int, int>();
            foreach (var tile in state.World.Tiles)
            {
                var cellPosCube = TileHelper.GetTilePosCube(tile);
                // MobileUnits
                foreach (var mobileUnit in tile.MobileUnits)
                {
                    if (MobileUnitHelper.IsPlayerMobileUnit(mobileUnit))
                    {
                        var mobileUnitPosCube = TileHelper.GetTilePosCube(mobileUnit.NextLocation);
                        MobileUnitManager.instance.CreateMobileUnit(
                            _playerMobileUnits.ToList()[0].Id,
                            mobileUnitPosCube,
                            true,
                            tile.MobileUnits.Count
                        );
                    }
                    else
                    {
                        playerMobileUnits.Add(mobileUnit, cellPosCube);
                    }
                    counter++;
                    if (counter % tileChunks == 0)
                        yield return null;
                }
                if (tile.MobileUnits.Count > 0)
                    tileMobileUnitCount.Add(cellPosCube, tile.MobileUnits.Count);
            }
            foreach (var mobileUnit in playerMobileUnits)
            {
                if (!MobileUnitHelper.IsPlayerMobileUnit(mobileUnit.Key))
                {
                    MobileUnitManager.instance.CreateMobileUnit(
                        mobileUnit.Key.Id,
                        mobileUnit.Value,
                        false,
                        tileMobileUnitCount[mobileUnit.Value]
                    );
                }
            }
        }

        currentSelectedMobileUnit = state.Selected.MobileUnit;

        _isUpdating = false;
        interruptCount = 0;
    }

    public bool IsPlayerMobileUnit(string mobileUnitID)
    {
        if (_playerMobileUnits == null)
        {
            return false;
        }
        return _playerMobileUnits.Any(s => s.Id == mobileUnitID);
    }

    public void RemoveAllMobileUnits()
    {
        var allMobileUnits = spawnedMobileUnits.ToDictionary(pair => pair.Key, pair => pair.Value);
        foreach (KeyValuePair<string, MobileUnitController> mobileUnit in allMobileUnits)
        {
            mobileUnit.Value.DestroyMapElement();
            spawnedMobileUnits.Remove(mobileUnit.Key);
        }
    }

    public void RemoveMobileUnits(List<Cog.MobileUnits> mobileUnits)
    {
        var filteredDictionary = spawnedMobileUnits
            .Where(pair => mobileUnits.Any(s => s.Id == pair.Key))
            .ToDictionary(pair => pair.Key, pair => pair.Value);
        foreach (KeyValuePair<string, MobileUnitController> mobileUnit in filteredDictionary)
        {
            mobileUnit.Value.DestroyMapElement();
            spawnedMobileUnits.Remove(mobileUnit.Key);
        }
    }

    public void RemoveMobileUnit(Cog.MobileUnits mobileUnit)
    {
        if (spawnedMobileUnits.ContainsKey(mobileUnit.Id))
        {
            spawnedMobileUnits[mobileUnit.Id].DestroyMapElement();
            spawnedMobileUnits.Remove(mobileUnit.Id);
        }
    }

    public void CreateMobileUnit(
        string mobileUnitId,
        Vector3Int cell,
        bool isPlayer,
        int numMobileUnitsAtPos
    )
    {
        IncreaseMobileUnitPositionCount(cell);

        numMobileUnitsAtPos = Mathf.Max(numMobileUnitsAtPos, mobileUnitPositionCounts[cell]);
        int buildingOnCell = MapElementManager.instance.IsElementAtCell(cell);
        int index = mobileUnitPositionCounts[cell] - 1;

        if (!spawnedMobileUnits.ContainsKey(mobileUnitId))
        {
            MobileUnitController controller;

            if (isPlayer)
                controller = Instantiate(mobileUnitPrefab).GetComponent<MobileUnitController>();
            else
                controller = Instantiate(mobileUnitPrefab).GetComponent<MobileUnitController>();

            controller.Setup(
                cell,
                numMobileUnitsAtPos + buildingOnCell,
                index,
                isPlayer,
                mobileUnitId
            );
            spawnedMobileUnits.Add(mobileUnitId, controller);
        }
        else
        {
            spawnedMobileUnits[mobileUnitId].CheckPosition(
                cell,
                numMobileUnitsAtPos + buildingOnCell,
                index,
                isPlayer
            );
        }
    }

    public void ResetMobileUnitPositionCounts()
    {
        mobileUnitPositionCounts = new Dictionary<Vector3Int, int>();
    }

    public void IncreaseMobileUnitPositionCount(Vector3Int cell)
    {
        if (!mobileUnitPositionCounts.ContainsKey(cell))
            mobileUnitPositionCounts.Add(cell, 1);
        else
            mobileUnitPositionCounts[cell]++;
    }

    public MobileUnitController GetMobileUnitController()
    {
        return spawnedMobileUnits[currentSelectedMobileUnit.Id];
    }
}
