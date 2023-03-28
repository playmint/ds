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
        Cog.GameStateMediator.Instance.EventStateUpdated += OnStateUpdated;
    }

    private void OnDestroy()
    {
        Cog.GameStateMediator.Instance.EventStateUpdated -= OnStateUpdated;
    }

    private void OnStateUpdated(GameState state)
    {
        if (_hidden)
            return;

        //foreach (var seeker in state.Game.Seekers)
        //{
        //    var isPlayerSeeker = (
        //        SeekerManager.Instance.Seeker != null
        //        && SeekerManager.Instance.Seeker.Id == seeker.Id
        //    );

        //}
        if (state.World.Tiles.Count > 0)
        {
            Debug.Log("Fading Overlay");
            _hidden = true;
            StartCoroutine(FadeOutCR());
            return;
        }
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
