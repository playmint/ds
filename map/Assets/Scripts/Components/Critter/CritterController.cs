using System.Collections;
using System.Runtime.InteropServices;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;

public class CritterController : BaseComponentController<CritterData>
{
    [SerializeField]
    protected Renderer[] renderers;

    [SerializeField]
    private AnimationCurve _moveCurve,
        _jumpCurve,
        _visibilityCurve;

    protected Color _defaultColor;

    private Transform _meshesTrans;

    private Coroutine? _runningMovementCR;
    private Coroutine? _runningVisibilityCR;

    protected void Start()
    {
        if (renderers.Length > 0)
        {
            _defaultColor = renderers[0].material.GetColor("_EmissionColor");
        }

        _meshesTrans = transform.GetChild(0);
    }

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }

        transform.localScale = new Vector3(_nextData.radius, _nextData.radius, _nextData.radius);
        transform.GetChild(0).localEulerAngles = new Vector3(0, _nextData.rotation, 0);

        // movement
        if (_prevData == null)
        {
            Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
            Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
            transform.position = new Vector3(worldPos.x, _nextData.height, worldPos.z);
        }
        else if (
            _prevData.q != _nextData.q || _prevData.r != _nextData.r || _prevData.s != _nextData.s
        )
        {
            Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
            Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);

            if (_runningMovementCR != null)
            {
                StopCoroutine(_runningMovementCR);
            }

            _runningMovementCR = StartCoroutine(
                SmoothMoveCR(new Vector3(worldPos.x, _nextData.height, worldPos.z))
            );
        }

        // Visibility
        if (_prevData == null)
        {
            if (_runningVisibilityCR != null)
            {
                StopCoroutine(_runningVisibilityCR);
            }
            _runningVisibilityCR = StartCoroutine(
                VisibilityCR(new Vector3(1, 1, 1), _nextData.visible ? 1 : 0)
            );
        }
        else if (_prevData.visible && !_nextData.visible)
        {
            if (_runningVisibilityCR != null)
            {
                StopCoroutine(_runningVisibilityCR);
            }
            _runningVisibilityCR = StartCoroutine(
                VisibilityCR(new Vector3(1, 1, 1), 0, 0.35f, 3.5f)
            );
        }
        else if (!_prevData.visible && _nextData.visible)
        {
            if (_runningVisibilityCR != null)
            {
                StopCoroutine(_runningVisibilityCR);
            }
            _runningVisibilityCR = StartCoroutine(VisibilityCR(new Vector3(1, 1, 1), 1));
        }

        _prevData = _nextData;
    }

    // Animations

    private IEnumerator SmoothMoveCR(Vector3 endPos)
    {
        float t = 0;
        Vector3 startPos = transform.position;
        while (t < 1)
        {
            t += Time.deltaTime * 0.5f;
            transform.position = Vector3.Lerp(startPos, endPos, _moveCurve.Evaluate(t));
            transform.position = Vector3.Lerp(
                new Vector3(transform.position.x, transform.position.y, transform.position.z),
                new Vector3(transform.position.x, endPos.y + 0.5f, transform.position.z),
                _jumpCurve.Evaluate(t)
            );
            yield return null;
        }
        transform.position = endPos;
        _runningMovementCR = null;
    }

    IEnumerator VisibilityCR(
        Vector3 endScale,
        float endFade,
        float delay = 0,
        float deltaMultiplier = 2f
    )
    {
        _meshesTrans.gameObject.SetActive(true);

        float t = 0;
        Vector3 startScale = _meshesTrans.localScale;
        float startFade = renderers[0].material.GetFloat("_Fade");
        yield return new WaitForSeconds(delay);
        while (t < 1)
        {
            t += Time.deltaTime * deltaMultiplier;
            _meshesTrans.localScale = Vector3.LerpUnclamped(
                startScale,
                endScale,
                _visibilityCurve.Evaluate(t)
            );
            foreach (Renderer rend in renderers)
            {
                rend.material.SetFloat(
                    "_Fade",
                    Mathf.Lerp(startFade, endFade, _visibilityCurve.Evaluate(t))
                );
            }
            yield return null;
        }

        // Turning off mesh after fadeout to disable both events and to fix problem with overlapping unit's outine not displaying
        _meshesTrans.gameObject.SetActive(endFade > 0);

        foreach (Renderer rend in renderers)
        {
            rend.material.SetFloat("_Fade", endFade);
        }

        _runningVisibilityCR = null;
    }
}
