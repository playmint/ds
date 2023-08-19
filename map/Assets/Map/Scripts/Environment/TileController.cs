using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class TileController : MonoBehaviour
{
    [SerializeField]
    AnimationCurve popInCurve;

    [SerializeField]
    Renderer rend;

    private float delay;

    bool hasRisen = false;

    public void AppearFull()
    {
        if (hasRisen)
            return;
        hasRisen = true;
        delay = Mathf.Clamp(Camera.main.WorldToViewportPoint(transform.position).x, 0, 1);
        StartCoroutine(AppearFullCR());
    }

    IEnumerator AppearFullCR()
    {
        float t = 0;
        Vector3 startPos = transform.position;
        Vector3 endPos = new Vector3(
            transform.position.x,
            MapHeightManager.instance.GetHeightAtPosition(transform.position),
            transform.position.z
        );
        yield return new WaitForSeconds(delay);
        while (t < 1)
        {
            t += Time.deltaTime * 3;
            transform.position = Vector3.LerpUnclamped(startPos, endPos, popInCurve.Evaluate(t));
            MapManager.instance.dynamicMatProps.SetColor(
                "_Color",
                Color.Lerp(
                    MapManager.instance.scoutColor,
                    MapManager.instance.normalColor,
                    popInCurve.Evaluate(t)
                )
            );
            rend.SetPropertyBlock(MapManager.instance.dynamicMatProps);
            yield return null;
        }

        rend.SetPropertyBlock(MapManager.instance.normalMatProps);
    }

    public void Appear()
    {
        hasRisen = false;
        transform.position = new Vector3(transform.position.x, -1, transform.position.z);
        delay = Mathf.Clamp(Camera.main.WorldToViewportPoint(transform.position).x, 0, 1);
        rend.SetPropertyBlock(MapManager.instance.unscoutedMatProps);
        StartCoroutine(AppearCR());
    }

    IEnumerator AppearCR()
    {
        float t = 0;
        Vector3 startPos = new Vector3(transform.position.x, -1, transform.position.z);
        Vector3 endPos = new Vector3(
            transform.position.x,
            MapHeightManager.UNSCOUTED_HEIGHT,
            transform.position.z
        );
        yield return new WaitForSeconds(delay);

        while (t < 1)
        {
            t += Time.deltaTime * 3;
            transform.position = Vector3.LerpUnclamped(startPos, endPos, popInCurve.Evaluate(t));
            yield return null;
        }
    }
}
