using System.Collections;
using System.Collections.Generic;
using Cog;
using UnityEngine;

public class ActionMenuButtonController : MonoBehaviour
{
    public string ButtonIntent = Intent.MOVE;

    [SerializeField]
    private float _disabledAlpha = 0.25f;
    private bool _isEnabled = true;
    private CanvasGroup _canvasGroup;

    protected void Awake()
    {
        _canvasGroup = GetComponent<CanvasGroup>();
        Enable();
    }

    public void ButtonClicked()
    {
        if (GameStateMediator.Instance.gameState.Selected.Intent == ButtonIntent)
        {
            // Cancel intent if already in intent for this button
            GameStateMediator.Instance.SendSetIntentMsg(Intent.NONE);
        }
        else
        {
            GameStateMediator.Instance.SendSetIntentMsg(ButtonIntent);
        }
    }

    public void Disable()
    {
        if (!_isEnabled)
            return;

        _canvasGroup.alpha = _disabledAlpha;
        _isEnabled = false;
    }

    public void Enable()
    {
        if (_isEnabled)
            return;

        _canvasGroup.alpha = 1;
        _isEnabled = true;
    }
}
