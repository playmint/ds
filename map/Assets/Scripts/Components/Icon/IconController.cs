using System.Collections;
using System.IO;
using System.Threading.Tasks;
using Unity.VectorGraphics;
using UnityEngine;
using UnityEngine.Networking;

public class IconController : BaseComponentController<IconData>
{
    [SerializeField]
    SpriteMask rend;
    [SerializeField]
    GameObject background;
    [SerializeField]
    SpriteRenderer backgroundFill;
    [SerializeField]
    SpriteRenderer foregroundFill;

    private Transform _camTrans;

    protected void Start()
    {
        _camTrans = Camera.main.transform;
    }

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }
        Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        transform.position = new Vector3(worldPos.x, _nextData.height, worldPos.z);

        ColorUtility.TryParseHtmlString(_nextData.backgroundColor, out Color bgCol);
        ColorUtility.TryParseHtmlString(_nextData.foregroundColor, out Color fgCol);

        backgroundFill.color = bgCol;
        foregroundFill.color = fgCol;

        if (_nextData.image != null)
        {
            if (_prevData == null || _nextData.image != _prevData.image)
            {
                rend.sprite = null;
                background.SetActive(false);
                StartCoroutine(LoadSVG(_nextData.image));
            }
        }

        _prevData = _nextData;
    }

    IEnumerator LoadSVG(string url)
    {
        var request = UnityWebRequest.Get(url);
        request.SendWebRequest();
        while (!request.isDone) yield return null; // wait 1 frame until request done
        if (request.result == UnityWebRequest.Result.ConnectionError || request.result == UnityWebRequest.Result.DataProcessingError || request.result == UnityWebRequest.Result.ProtocolError)
        {
            Debug.Log("Error: " + request.error);
        }
        else
        {
            rend.sprite = ConvertSVGToSprite(request.downloadHandler.text);
            background.SetActive(true);
        }
    }

    protected void LateUpdate()
    {
        transform.rotation = _camTrans.rotation;
    }

    private Sprite ConvertSVGToSprite(string svgFile)
    {
        using StringReader textReader = new StringReader(svgFile);
        var sceneInfo = SVGParser.ImportSVG(textReader);
        var geoms = VectorUtils.TessellateScene(sceneInfo.Scene, new VectorUtils.TessellationOptions
        {
            StepDistance = 1f,
            SamplingStepSize = 100,
            MaxCordDeviation = 0.5f,
            MaxTanAngleDeviation = 0.1f
        });

        // Build a sprite with the tessellated geometry.
        var sprite = VectorUtils.BuildSprite(geoms, 1.0f, VectorUtils.Alignment.Center, Vector2.zero, 64, true);

        //This next bit is a bit of a faff, but it normalises the sprite so that different size SVGs are scaled to fit in the icon:
        var mat = new Material(Shader.Find("Unlit/Vector"));
        sprite = Sprite.Create(VectorUtils.RenderSpriteToTexture2D(sprite, 256, 256, mat), new Rect(0, 0, 256, 256), Vector2.one * 0.5f);

        sprite.name = "icon";
        return sprite;
    }
}
