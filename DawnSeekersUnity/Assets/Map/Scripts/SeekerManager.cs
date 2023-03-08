using Cog;
using UnityEngine;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.Contracts;
using System.Linq;

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
        return Seeker != null && TileHelper.GetTilePosCube(Seeker.Location.Next.Tile) == cellPosCube;
    }

    // -- LISTENERS

    private void OnStateUpdated(State state)
    {
        Seeker = (state.UI.Selection.Player != null && state.UI.Selection.Player.Seekers.Count > 0)? state.UI.Selection.Player.Seekers.ToList()[0] : null;
        if (Seeker != null)
        {
            Debug.Log("SeekerManager: Seeker found. ID: " + Seeker.Id);
        }
#if  UNITY_EDITOR
        else
        {
            Debug.Log("SeekerManager: No seeker found");
        }
#endif
    }
}
