using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class TileController : MonoBehaviour
{
    [SerializeField]
    AnimationCurve popInCurve;

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
            transform.position.y,
            MapHeightManager.instance.GetHeightAtPosition(transform.position)
        );
        yield return new WaitForSeconds(delay);
        while (t < 1)
        {
            t += Time.deltaTime * 3;
            transform.position = Vector3.LerpUnclamped(startPos, endPos, popInCurve.Evaluate(t));
            yield return null;
        }
        delayCount--;
    }

    public void Appear()
    {
        transform.position = new Vector3(transform.position.x, transform.position.y, 1);
        delayCount++;
        delay += 0.05f;
        StartCoroutine(AppearCR());
    }

    IEnumerator AppearCR()
    {
        float t = 0;
        Vector3 startPos = new Vector3(transform.position.x, transform.position.y, 1);
        Vector3 endPos = new Vector3(
            transform.position.x,
            transform.position.y,
            MapHeightManager.UNSCOUTED_HEIGHT
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
