using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public class ParabolicLineController : MonoBehaviour
{
    [SerializeField]
    private int _resolution = 10;

    [SerializeField]
    private float _lineHeight = 1;

    [SerializeField]
    private float _lineHeightAdditionPerDistance = 0.1f;

    [SerializeField]
    private AnimationCurve _lineCurve;
    private LineRenderer line;

    [SerializeField]
    float lineRevealSpeedMultiplier = 5;

    private void Awake()
    {
        line = GetComponent<LineRenderer>();
        line.positionCount = _resolution + 1;
    }

    public void HideLine()
    {
        line.enabled = false;
    }

    public void DrawLine(Vector3 startPos, Vector3 endPos)
    {
        line.enabled = true;
        Vector3[] positions = new Vector3[_resolution + 1];
        for (int i = 0; i < _resolution; i++)
        {
            Vector3 dir = (endPos - startPos) / _resolution;
            positions[i] = startPos + (dir * i);
            positions[i].y +=
                _lineCurve.Evaluate((float)i / (float)_resolution)
                * (
                    _lineHeight
                    + (Vector3.Distance(startPos, endPos) * _lineHeightAdditionPerDistance)
                );
        }
        positions[_resolution] = endPos;
        StartCoroutine(RevealLineCR(positions));
    }

    IEnumerator RevealLineCR(Vector3[] positions)
    {
        float t = 0;
        line.positionCount = 0;
        while (t < 1)
        {
            t += Time.deltaTime / lineRevealSpeedMultiplier;
            int count = Mathf.FloorToInt(t * positions.Length);
            if (count > 10)
                break;
            line.positionCount = count;
            Vector3[] clipPos = positions.Take(line.positionCount).ToArray();

            line.SetPositions(clipPos);
            yield return null;
        }
        line.positionCount = positions.Length;
        line.SetPositions(positions);
    }
}
