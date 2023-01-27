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
    public class MoveSeekerAction : FunctionMessage {

        [Parameter("uint32", "_sid", 0)]
        public string sid { get; set; }

        [Parameter("int16", "_q", 0)]
        public int q { get; set; }

        [Parameter("int16", "_r", 0)]
        public int r { get; set; }

        [Parameter("int16", "_s", 0)]
        public int s { get; set; }

    }
}