using System;
using Cog;
using UnityEngine;
using System.Linq;

public class TileHelper
{
    public static Vector3Int GetTilePosCube(Tile tile)
    {
        return new Vector3Int(Convert.ToInt16(tile.Coords.Q), Convert.ToInt16(tile.Coords.R), Convert.ToInt16(tile.Coords.S));
    }

    public static bool HasResource(Tile tile)
    {
        return false; //tile.Bags.ToList().Find(equipSlot => equipSlot.Bag..Find(slot => slot.Balance > 0) != null) != null;
    }

    public static Vector3Int[] GetTileNeighbours(Vector3Int tile)
    {
        return new Vector3Int[6]
        {
            tile + new Vector3Int(1, -1, 0),
            tile + new Vector3Int(0, 1, -1),
            tile + new Vector3Int(-1, 0, 1),
            tile + new Vector3Int(-1, 1, 0),
            tile + new Vector3Int(0, -1, 1),
            tile + new Vector3Int(1, 0, -1)
        };
    }
}
