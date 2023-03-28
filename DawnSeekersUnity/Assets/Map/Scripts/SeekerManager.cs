using Cog;
using UnityEngine;
using System.Linq;
using System.Collections.Generic;
using System;

public class SeekerManager : MonoBehaviour
{
    public static SeekerManager Instance;

    public Seekers Seeker { get; private set; }
    private ICollection<Seekers> _playerSeekers;

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
            // if there were _playerSeekers then we have signed out
            if (_playerSeekers != null)
            {
                // Removed seekers for previous signed in account and add back as non-player seekers
                IconManager.instance.RemoveSeekers(_playerSeekers.ToList());
                createSeekerIcons(_playerSeekers.ToList(), false);

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
            IconManager.instance.RemoveSeekers(_playerSeekers.ToList());
            createSeekerIcons(_playerSeekers.ToList(), false);

            // Remove seeker icon for current account as it'll be the dark version
            IconManager.instance.RemoveSeeker(playerSeeker);
        }

        _playerSeekers = state.Player.Seekers;

        Seeker = playerSeeker;
        createSeekerIcon(Seeker, true);
    }

    private void createSeekerIcons(List<Seekers> seekers, bool isPlayerSeeker)
    {
        foreach (var seeker in seekers)
        {
            createSeekerIcon(seeker, isPlayerSeeker);
        }
    }

    private void createSeekerIcon(Seekers seeker, bool isPlayerSeeker)
    {
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
            isPlayerSeeker,
            seekerTile.Seekers.Count
        );
    }
}
