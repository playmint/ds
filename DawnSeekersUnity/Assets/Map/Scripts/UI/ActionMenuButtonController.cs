using System.Collections;
using System.Collections.Generic;
using Cog;
using UnityEngine;

public class ActionMenuButtonController : MonoBehaviour
{
    public void ButtonClicked()
    {
        PluginController.Instance.SendSetIntentMsg(Intent.MOVE);
    }
}
