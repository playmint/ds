using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class MobileUnitModelController : MonoBehaviour
{
    public List<Renderer> renderers;
    public List<Renderer> outlineRenderers;

    public Coroutine? _runningVisibilityCR;

    public IEnumerator VisibilityCR(
        Vector3 endScale,
        float endFade,
        AnimationCurve _visibilityCurve,
        float delay = 0,
        float deltaMultiplier = 2f
    )
    {
        transform.parent.gameObject.SetActive(true);

        // disable the outline meshes if fading out
        foreach (Renderer outlineObj in outlineRenderers)
        {
            outlineObj.gameObject.SetActive(endFade > 0);
        }

        float t = 0;
        float startFade = renderers[0].material.GetFloat("_Fade");
        yield return new WaitForSeconds(delay);
        while (t < 1)
        {
            t += Time.deltaTime * deltaMultiplier;
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
        transform.parent.gameObject.SetActive(endFade > 0);

        foreach (Renderer rend in renderers)
        {
            rend.material.SetFloat("_Fade", endFade);
        }

        _runningVisibilityCR = null;
    }
}
