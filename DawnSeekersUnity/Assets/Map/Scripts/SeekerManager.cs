using Cog.GraphQL;
using UnityEngine;
using Nethereum.Util;
using Nethereum.Hex.HexConvertors.Extensions;
using System.Numerics;

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
        Cog.PluginController.Instance.StateUpdated += OnStateUpdated;
        if (Cog.PluginController.Instance.State != null) 
        {
            OnStateUpdated(Cog.PluginController.Instance.State);
        }
    }

    private void OnStateUpdated(State state)
    {
        var accountBigInt = Cog.PluginController.Instance.Account.HexToBigInteger(false);
        var seekerIDBigInt = accountBigInt & "0xffffffff".HexToBigInteger(false);
        var seekerID = seekerIDBigInt.ToHex(false);

        Seeker = state.Seekers.Find( seeker => seeker.SeekerID == seekerID );
        if (Seeker == null) 
        {
            Debug.LogError("SeekerManager: No seeker found. Spawn a seeker!!");
        }
        else
        {
            Debug.Log("SeekerManager: Seeker found: " + Seeker.SeekerID);
        }
    }
}