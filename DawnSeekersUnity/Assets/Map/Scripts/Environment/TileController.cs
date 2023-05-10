using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class TileController : MonoBehaviour
{
    [SerializeField]
    AnimationCurve popInCurve;

    [SerializeField]
    Renderer rend;

    private static int delayCount;
    private static float delay;

    bool hasRisen = false;

    public void AppearFull()
    {
        if (hasRisen)
            return;
        hasRisen = true;
        delayCount++;

        StartCoroutine(AppearFullCR());
        delay += 0.05f;
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
        delayCount--;
    }

    public void Appear()
    {
        transform.position = new Vector3(transform.position.x, -1, transform.position.z);
        delayCount++;
        delay += 0.05f;
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

        delayCount--;
        if (delayCount == 0)
            delay = 0;
    }
}
