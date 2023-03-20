using System.Collections;
using System.Collections.Generic;
using Cog;
using UnityEngine;

public class ActionMenuButtonController : MonoBehaviour
{
    public void ButtonClicked()
    {
        // SeekerMovementManager.instance.ActivateMovementMode();
        PluginController.Instance.SendSetIntentionMsg(1, new List<string>());
    }
}
