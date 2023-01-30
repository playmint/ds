using Cog.GraphQL;
using UnityEngine;

public class TileHelper
{
    public static Vector3Int GetTilePosCube(Tile tile)
    {
        var q = System.Convert.ToInt16(tile.Coords[1], 16);
        var r = System.Convert.ToInt16(tile.Coords[2], 16);
        var s = System.Convert.ToInt16(tile.Coords[3], 16);

        return new Vector3Int(q, r, s);
    }
}