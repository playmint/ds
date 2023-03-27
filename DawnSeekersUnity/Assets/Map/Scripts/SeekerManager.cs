using Cog;
using UnityEngine;
using System.Linq;
using System.Collections.Generic;

public class SeekerManager : MonoBehaviour
{
    public static SeekerManager Instance;

    public Seekers Seeker { get; private set; }
    private ICollection<Seeker> _playerSeekers;

    protected void Awake()
    {
        Instance = this;
    }

    protected void Start()
    {
        Cog.GameStateMediator.Instance.EventStateUpdated += OnStateUpdated;
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
        if (state.Player == null || state.Player.Seekers == null || state.Player.Seekers.Count == 0)
        {
            // We're either not logged in or don't have any seekers yet
            if (_playerSeekers != null)
            {
                // TODO: Not sure if this will be handled automatically by MapManager
                // Removed previous seekers
                // IconManager.instance.RemoveSeekers(_playerSeekers.ToList());
                _playerSeekers = null;
                Seeker = null;
            }
            return;
        }

        var seekersToRemove = new List<Cog.Seeker>();

        var playerSeeker = state.Player.Seekers.ToList()[0];
        if (playerSeeker != null)
        {
            Seeker = playerSeeker;
            var seekerPosCube = TileHelper.GetTilePosCube(Seeker.NextLocation);
            var seekerTile = TileHelper.GetTileByPos(seekerPosCube);
            var cell = new MapManager.MapCell
            {
                cubicCoords = seekerPosCube,
                typeID = 0,
                iconID = 0,
                cellName = ""
            };

            IconManager.instance.CreateSeekerIcon(
                Seeker,
                cell,
                true,
                seekerTile.Seekers.Count + 1 // HACK: because the seeker positions in the map data is one behind the player's position
            );
        }

        IconManager.instance.RemoveSeekers(seekersToRemove);
    }
}
