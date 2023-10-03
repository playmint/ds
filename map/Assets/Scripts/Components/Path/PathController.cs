using System.Collections;
using UnityEngine;
using System.Linq;

public class PathController : BaseComponentController<PathData>
{
    [SerializeField]
    Transform destinationMarker;

    [SerializeField]
    GameObject lineMarker;

    [SerializeField]
    private int _resolution = 10;

    private Vector3[] _linePositions;

    [SerializeField]
    private float _lineHeight = 1;

    [SerializeField]
    private float _lineHeightAdditionPerDistance = 0.1f;

    [SerializeField]
    private AnimationCurve _lineCurve;

    private LineRenderer line;

    [SerializeField]
    float lineRevealSpeedMultiplier = 5;

    private string _defaultColor = "#47E4FF";

    protected void Start()
    {
        _linePositions = new Vector3[_resolution + 1];
        line = lineMarker.GetComponent<LineRenderer>();
        line.positionCount = _resolution + 1;
    }

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }

        // set line color
        ColorUtility.TryParseHtmlString(
            _nextData.color == null || _nextData.color == "" ? _defaultColor : _nextData.color,
            out Color targetColor
        );
        if (targetColor == null)
        {
            Debug.Log($"invalid color {_nextData.color} falling back to {_defaultColor}");
            ColorUtility.TryParseHtmlString(_defaultColor, out targetColor);
        }
        line.startColor = targetColor;
        line.endColor = targetColor;

        // calc start world pos of arc
        Vector3Int fromCube = new(_nextData.qFrom, _nextData.rFrom, _nextData.sFrom);
        Vector3 fromWorld = CoordsHelper.CubeToWorld(fromCube);
        Vector3 startOffset = new(fromWorld.x, _nextData.heightFrom + 0.01f, fromWorld.z);

        // calc end world pos of arc
        Vector3Int toCube = new(_nextData.qTo, _nextData.rTo, _nextData.sTo);
        Vector3 toWorld = CoordsHelper.CubeToWorld(toCube);
        Vector3 endOffset = new(toWorld.x, _nextData.heightTo + 0.01f, toWorld.z);

        // TODO:
        // check longer lines spanning more than one tile ... doesn't need fixing yet but might be useful
        // maybe allowing setting arc height

        // set dest marker
        destinationMarker.position = endOffset + (Vector3.up * 0.01f);
        destinationMarker.gameObject.SetActive(true);

        // update line positions
        line.enabled = true;
        _linePositions = new Vector3[_resolution + 1];
        for (int i = 0; i < _resolution; i++)
        {
            Vector3 dir = (endOffset - startOffset) / _resolution;
            _linePositions[i] = startOffset + (dir * i);
            _linePositions[i].y +=
                _lineCurve.Evaluate((float)i / (float)_resolution)
                * (
                    _lineHeight
                    + (Vector3.Distance(startOffset, endOffset) * _lineHeightAdditionPerDistance)
                );
        }
        _linePositions[_resolution] = endOffset;

        // animate in if first draw
        if (_prevData == null)
        {
            StartCoroutine(RevealLineCR());
        }
        // else only update pos
        else
        {
            line.positionCount = _linePositions.Length;
            line.SetPositions(_linePositions);
        }

        _prevData = _nextData;
    }

    IEnumerator RevealLineCR()
    {
        float t = 0;
        line.positionCount = 0;
        while (t < 1)
        {
            t += Time.deltaTime / lineRevealSpeedMultiplier;
            int count = Mathf.FloorToInt(t * _linePositions.Length);
            if (count > 10)
                break;
            line.positionCount = count;
            Vector3[] clipPos = _linePositions.Take(line.positionCount).ToArray();

            line.SetPositions(clipPos);
            yield return null;
        }
        line.positionCount = _linePositions.Length;
        line.SetPositions(_linePositions);
    }
}
