using System;
using Cog;
using UnityEngine;
using System.Linq;

public class TileHelper
{
    public static Vector3Int GetTilePosCube(Tiles2 tile)
    {
        var coords = tile.Coords
            .Select(
                (object coord) =>
                {
                    return Convert.ToInt16(coord as string, 16);
                }
            )
            .ToArray();

        return new Vector3Int(coords[1], coords[2], coords[3]);
    }

    public static Vector3Int GetTilePosCube(Tiles tile)
    {
        var coords = tile.Coords
            .Select(
                (object coord) =>
                {
                    return Convert.ToInt16(coord as string, 16);
                }
            )
            .ToArray();

        return new Vector3Int(coords[1], coords[2], coords[3]);
    }

    public static Vector3Int GetTilePosCube(NextLocation loc)
    {
        // TODO: NextLocation hasn't generated properly so doesn't show the fields it has on it!
        var tileObj = loc.AdditionalProperties["tile"] as Newtonsoft.Json.Linq.JObject;
        var coordsObj = tileObj.GetValue("coords");
        var coords = coordsObj
            .Values<string>()
            .Select(
                (coord) =>
                {
                    return Convert.ToInt16(coord, 16);
                }
            )
            .ToArray();

        return new Vector3Int(coords[1], coords[2], coords[3]);
    }

    public static Vector3Int GetTilePosCube(NextLocation2 loc)
    {
        // TODO: NextLocation hasn't generated properly so doesn't show the fields it has on it!
        var tileObj = loc.AdditionalProperties["tile"] as Newtonsoft.Json.Linq.JObject;
        var coordsObj = tileObj.GetValue("coords");
        var coords = coordsObj
            .Values<string>()
            .Select(
                (coord) =>
                {
                    return Convert.ToInt16(coord, 16);
                }
            )
            .ToArray();

        return new Vector3Int(coords[1], coords[2], coords[3]);
    }

    // -- //

    public static bool HasResource(Tiles2 tile)
    {
        // TODO: Check for balance on tile (Currently not in data)
        return tile.BagCount > 0;
    }

    public static bool HasBuilding(Vector3Int tilePosCube)
    {
        var tile = GetTileByPos(tilePosCube);
        return tile != null && HasBuilding(tile);
    }

    public static bool HasBuilding(Tiles2 tile)
    {
        return tile.Building != null;
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

    // -- TODO: Obviously this won't scale, need to hold tiles in a dictionary
    public static bool IsDiscoveredTile(Vector3Int cellPosCube)
    {
        var tile = GetTileByPos(cellPosCube);
        return tile != null && tile.Biome != 0;
    }

    internal static string GetTileID(Vector3Int tilePosCube)
    {
        return Cog.NodeKinds.TileNode.GetKey(0, tilePosCube.x, tilePosCube.y, tilePosCube.z);
    }

    internal static Tiles2 GetTileByPos(Vector3Int cellPosCube)
    {
        // BAD! This helper class shouldn't be coupled to the StateMediator like this
        return GameStateMediator.Instance.gameState.World.Tiles.FirstOrDefault(
            t => GetTilePosCube(t) == cellPosCube
        );
    }
}
