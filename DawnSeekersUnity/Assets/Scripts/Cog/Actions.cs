using Nethereum.Web3;
using Nethereum.Hex.HexConvertors.Extensions;
using Nethereum.KeyStore.Model;
using Nethereum.ABI.Encoders;
using Nethereum.Signer;
using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;

namespace Cog.Actions
{
    // function MOVE_SEEKER(uint32 sid, int16 q, int16 r, int16 s) external;
    [Function("MOVE_SEEKER")]
    public class MoveSeekerAction : FunctionMessage
    {
        [Parameter("uint32", "_sid", 0)]
        public string sid { get; set; }

        [Parameter("int16", "_q", 0)]
        public int q { get; set; }

        [Parameter("int16", "_r", 0)]
        public int r { get; set; }

        [Parameter("int16", "_s", 0)]
        public int s { get; set; }

        public MoveSeekerAction(string sid, int q, int r, int s)
        {
            this.sid = sid;
            this.q = q;
            this.r = r;
            this.s = s;
        }
    }

    // function DEV_SPAWN_SEEKER(address player, uint32 seekerID, int16 q, int16 r, int16 s) external;
    [Function("DEV_SPAWN_SEEKER")]
    public class DevSpawnSeekerAction : FunctionMessage
    {
        [Parameter("address", "_player", 0)]
        public string player { get; set; }

        [Parameter("uint32", "_sid", 0)]
        public string sid { get; set; }

        [Parameter("int16", "_q", 0)]
        public int q { get; set; }

        [Parameter("int16", "_r", 0)]
        public int r { get; set; }

        [Parameter("int16", "_s", 0)]
        public int s { get; set; }

        public DevSpawnSeekerAction(string player, string sid, int q, int r, int s)
        {
            this.player = player;
            this.sid = sid;
            this.q = q;
            this.r = r;
            this.s = s;
        }
    }

    [Function("DEV_SPAWN_TILE")]
    public class DevSpawnTileAction : FunctionMessage
    {
        [Parameter("uint8", "_kind", 0)]
        public uint kind { get; set; }

        [Parameter("int16", "_q", 0)]
        public int q { get; set; }

        [Parameter("int16", "_r", 0)]
        public int r { get; set; }

        [Parameter("int16", "_s", 0)]
        public int s { get; set; }

        public DevSpawnTileAction(uint kind, int q, int r, int s)
        {
            this.kind = kind;
            this.q = q;
            this.r = r;
            this.s = s;
        }
    }

    // function SCOUT_SEEKER(uint32 sid, int16 q, int16 r, int16 s) external;
    [Function("SCOUT_SEEKER")]
    public class ScoutSeekerAction : FunctionMessage
    {
        [Parameter("uint32", "_sid", 0)]
        public string sid { get; set; }

        [Parameter("int16", "_q", 0)]
        public int q { get; set; }

        [Parameter("int16", "_r", 0)]
        public int r { get; set; }

        [Parameter("int16", "_s", 0)]
        public int s { get; set; }

        public ScoutSeekerAction(string sid, int q, int r, int s)
        {
            this.sid = sid;
            this.q = q;
            this.r = r;
            this.s = s;
        }
    }
}
