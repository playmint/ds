using System;
using Cog;
using UnityEngine;
using System.Linq;

public class TileHelper
{
    public static Vector3Int GetTilePosCube(Tile tile)
    {
        return new Vector3Int(
            Convert.ToInt16(tile.Coords.Q),
            Convert.ToInt16(tile.Coords.R),
            Convert.ToInt16(tile.Coords.S)
        );
    }

    public static bool HasResource(Tile tile)
    {
        // TODO: Check for balance on tile (Currently not in data)
        return tile.Bags.Count > 0;
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

    internal static string GetTileID(Vector3Int tilePosCube)
    {
        return Cog.NodeKinds.TileNode.GetKey(0, tilePosCube.x, tilePosCube.y, tilePosCube.z);
    }
}
