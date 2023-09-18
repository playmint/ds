using System.Linq;
using UnityEngine;

public class TileHighlightController : BaseComponentController<TileHighlightData>
{
    [SerializeField]
    Sprite[] sprites;

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }
        Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        SpriteRenderer sr = GetComponentInChildren<SpriteRenderer>();
        sr.sprite = sprites.FirstOrDefault(s => s.name == _nextData.style);
        Color col = Color.clear;
        ColorUtility.TryParseHtmlString(_nextData.color, out col);
        sr.color = col;
        transform.position = new Vector3(worldPos.x, _nextData.height, worldPos.z);
        if (_prevData == null)
        {
            GetComponentInChildren<Animator>().Play(_nextData.animation);
        }
        _prevData = _nextData;
    }
}
