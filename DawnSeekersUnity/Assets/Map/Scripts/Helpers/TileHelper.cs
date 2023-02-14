using System;
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

    public static bool HasResource(Tile tile)
    {
        return tile.Bags.Find(bag => bag.Slots.Find(slot => slot.Balance > 0) != null) != null;
    }
}
