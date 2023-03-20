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

    internal static string GetTileID(Vector3Int key)
    {
        // TODO: Calculate the ID using TileNode.GetKey(0, q,r,s);
        var tile = PluginController.Instance.WorldState.Game.Tiles.FirstOrDefault(
            tile => GetTilePosCube(tile) == key
        );
        return tile.Id;
    }
}
