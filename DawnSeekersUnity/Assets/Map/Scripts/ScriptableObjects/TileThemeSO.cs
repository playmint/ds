using System.Collections;
using System.Collections.Generic;
using UnityEngine;

[CreateAssetMenu(menuName = "Tilemap/Theme")]
public class TileThemeSO : ScriptableObject
{
    [System.Serializable]
    public class TileTheme
    {
        public Color tileColor;
        public Sprite tileSprite;
    }

    public TileTheme[] tiles;
}
