using Nethereum.ABI.FunctionEncoding.Attributes;
using Nethereum.Contracts;
using Nethereum.ABI;
using Nethereum.Hex.HexConvertors.Extensions;

namespace Cog.NodeKinds
{
    [Function("Tile")]
    public class Tile : FunctionMessage { }

    public class TileNode
    {
        public static string GetKey(uint zone, int q, int r, int s)
        {
            var node = new Tile();
            var kindID = node.GetCallData();

            var encoder = new ABIEncode();
            var bytes = encoder.GetABIEncodedPacked(
                new ABIValue("bytes4", kindID),
                new ABIValue("uint96", 0),
                new ABIValue("uint16", zone),
                new ABIValue("int16", q),
                new ABIValue("int16", r),
                new ABIValue("int16", s)
            );

            return bytes.ToHex(true);
        }
    }
}
