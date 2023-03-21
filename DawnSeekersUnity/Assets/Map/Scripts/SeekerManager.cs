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
        var seekersToRemove = new List<Cog.Seeker>();

        var playerSeeker =
            (state.UI.Selection.Player != null && state.UI.Selection.Player.Seekers.Count > 0)
                ? state.UI.Selection.Player.Seekers.ToList()[0]
                : null;
        if (playerSeeker != null)
        {
            if (Seeker != null && Seeker.Id != playerSeeker.Id)
            {
                // If we've switched accounts then remove the previous player seeker as well as
                // the icon for the current seeker which would have been a grey 'other' seeker
                seekersToRemove.Add(Seeker);
                seekersToRemove.Add(playerSeeker);
            }
            else if (Seeker == null)
            {
                // If we weren't logged in prior then remove the grey 'other' seeker which will become our red seeker
                seekersToRemove.Add(playerSeeker);
            }

            Seeker = playerSeeker;
        }
        else if (Seeker != null)
        {
            // Signed out so remove the player seeker icon
            seekersToRemove.Add(Seeker);
        }

        IconManager.instance.RemoveSeekers(seekersToRemove);
    }
}
