using Cog;
using UnityEngine;
using System.Linq;

public class IntentHandler : MonoBehaviour
{
    public string Intent { get; protected set; }

    protected Vector3Int[] GetSelectedTilePositions(GameState state)
    {
        return state.Selected.Tiles.Select(tile => TileHelper.GetTilePosCube(tile)).ToArray();
    }
}
