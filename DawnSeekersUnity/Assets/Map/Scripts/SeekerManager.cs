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
        // var accountBigInt = Cog.PluginController.Instance.Account.HexToBigInteger(false);
        // var seekerIDBigInt = accountBigInt & "0xffffffff".HexToBigInteger(false);
        // var seekerID = seekerIDBigInt.ToHex(false);

        Seeker = state.Game.Seekers.ToList().Find(seeker => seeker.Owner.Id == Cog.PluginController.Instance.Account);
        if (Seeker != null)
        {
            Debug.Log("SeekerManager: Seeker found. ID: " + Seeker.Id);
        }
#if  UNITY_EDITOR
        else
        {
            Debug.Log("SeekerManager: No seeker found");
            // var action = new Cog.Actions.DevSpawnSeekerAction(
            //     Cog.PluginController.Instance.Account,
            //     seekerID,
            //     0,
            //     0,
            //     0
            // );

            // Cog.PluginController.Instance.DispatchAction(action.GetCallData());
        }
#endif
    }
}
