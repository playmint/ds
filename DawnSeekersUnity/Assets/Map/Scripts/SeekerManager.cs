using Cog;
using UnityEngine;
using System.Linq;
using System.Collections.Generic;

public class SeekerManager : MonoBehaviour
{
    public static SeekerManager Instance;

    public Seeker Seeker { get; private set; }

    protected void Awake()
    {
        Instance = this;
    }

    protected void Start()
    {
        Cog.PluginController.Instance.EventStateUpdated += OnStateUpdated;
        if (Cog.PluginController.Instance.WorldState != null)
        {
            OnStateUpdated(Cog.PluginController.Instance.WorldState);
        }
    }

    public bool IsPlayerAtPosition(Vector3Int cellPosCube)
    {
        return Seeker != null
            && TileHelper.GetTilePosCube(Seeker.Location.Next.Tile) == cellPosCube;
    }

    // -- LISTENERS

    // TODO: Still assuming only one seeker
    private void OnStateUpdated(State state)
    {
        var playerSeeker =
            (state.UI.Selection.Player != null && state.UI.Selection.Player.Seekers.Count > 0)
                ? state.UI.Selection.Player.Seekers.ToList()[0]
                : null;
        if (playerSeeker != null && (Seeker == null || Seeker.Id != playerSeeker.Id))
        {
            var seekersToRemove = new List<Cog.Seeker>();
            if (Seeker != null)
            {
                // If we've switched accounts then remove player icon
                seekersToRemove.Add(Seeker);
            }

            Seeker = playerSeeker;

            // Remove 'other seeker' icon so it gets replaced with the player icon
            seekersToRemove.Add(playerSeeker);

            IconManager.instance.RemoveSeekers(seekersToRemove);
        }
    }
}
