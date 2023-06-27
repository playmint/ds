using System.Collections;
using System.Collections.Generic;
using Cog;
using UnityEngine;

public class LoadingOverlay : MonoBehaviour
{
    CanvasGroup _group;
    private bool _hidden;

    private void Start()
    {
        _group = GetComponent<CanvasGroup>();
        _hidden = false;
        EnvironmentLoaderManager.EnvironmentAssetsLoaded += OnStateUpdated;
    }

    private void OnDestroy()
    {
        EnvironmentLoaderManager.EnvironmentAssetsLoaded -= OnStateUpdated;
    }

    private void OnStateUpdated()
    {
        if (_hidden)
            return;
        _hidden = true;
        StartCoroutine(FadeOutCR());
        return;
    }

    IEnumerator FadeOutCR()
    {
        float t = 0;
        while (t < 1)
        {
            t += Time.deltaTime;
            _group.alpha = 1 - t;
            yield return null;
        }
        gameObject.SetActive(false);
    }
}
