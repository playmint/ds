using System;
using Cog;
using UnityEngine;
using System.Linq;
using System.Collections;
using System.Globalization;
using System.Collections.Generic;

public class TileHelper
{
    

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

    public static Vector3Int GetTilePosCubeShared(ICollection<object> coords)
    {
        short x = short.Parse(coords.ElementAt(1).ToString().Substring(2), NumberStyles.HexNumber);
        short y = short.Parse(coords.ElementAt(2).ToString().Substring(2), NumberStyles.HexNumber);
        short z = short.Parse(coords.ElementAt(3).ToString().Substring(2), NumberStyles.HexNumber);

        return new Vector3Int(x, y, z);
    }

    public static Vector3Int GetTilePosCube(Tiles2 tile)
    {
        return GetTilePosCubeShared(tile.Coords);
    }

    public static Vector3Int GetTilePosCube(Tiles tile)
    {
        return GetTilePosCubeShared(tile.Coords);
    }

    public static Vector3Int GetTilePosCube(NextLocation2 loc)
    {
        return GetTilePosCubeShared(loc.Tile.Coords);
    }

    public static Vector3Int GetTilePosCube(NextLocation4 loc)
    {
        return GetTilePosCubeShared(loc.Tile.Coords);
    }




    public static Vector3Int GetTilePosCube(PrevLocation2 loc)
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
        if (tile.BagBalances != null && tile.BagBalances.Count > 0)
        {
            double totalBalance = tile.BagBalances.Aggregate(
                0.0,
                (acc, balObj) => acc + balObj.Balance
            );
            return totalBalance > 0;
        }
        return false;
    }

    public static bool HasEnemy(Tiles2 tile)
    {
        return tile.Building != null
            && tile.Building.Kind.Model != null
            && tile.Building.Kind.Model.Value == "enemy";
    }

    public static bool HasActiveCombatSession(Tiles2 tile)
    {
        var activeSession = GetActiveSession(tile);
        return activeSession != null;
    }

    public static Sessions2 GetActiveSession(Tiles2 tile)
    {
        return tile.Sessions.FirstOrDefault(
            session => session.IsFinalised == null || session.IsFinalised.Flag != 1
        );
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
