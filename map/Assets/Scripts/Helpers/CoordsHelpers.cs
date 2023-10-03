using UnityEngine;

public class CoordsHelper
{
    // public static Vector3Int[] GetTileNeighbours(Vector3Int tile)
    // {
    //     return new Vector3Int[6]
    //     {
    //         tile + new Vector3Int(1, -1, 0),
    //         tile + new Vector3Int(0, 1, -1),
    //         tile + new Vector3Int(-1, 0, 1),
    //         tile + new Vector3Int(-1, 1, 0),
    //         tile + new Vector3Int(0, -1, 1),
    //         tile + new Vector3Int(1, 0, -1)
    //     };
    // }

    // NOTE: Unity's grid uses Odd R offset coordinates
    public static Vector3Int GridToCube(Vector3Int gridCoords)
    {
        int q = gridCoords.x - (gridCoords.y - (gridCoords.y & 1)) / 2;
        int r = gridCoords.y;
        return new Vector3Int(q, r, -q - r);
    }

    public static Vector3Int CubeToGrid(Vector3Int cubeCoords)
    {
        int x = cubeCoords.x + (cubeCoords.y - (cubeCoords.y & 1)) / 2;
        int y = cubeCoords.y;
        return new Vector3Int(x, y, 0);
    }

    public static Vector3 CubeToWorld(Vector3Int cubeCoords)
    {
        // the 0.5f here is related to the size of the tile
        var x = 0.5f * (Mathf.Sqrt(3) * cubeCoords.x + (Mathf.Sqrt(3) / 2) * cubeCoords.y);
        var y = 0.01f;
        var z = 0.5f * ((3f / 2f) * cubeCoords.y);
        return new Vector3(x, y, z);
    }
}
