using System.Collections;
using System.Collections.Generic;
using Cog;
using UnityEngine;

public class ActionMenuButtonController : MonoBehaviour
{
    public void ButtonClicked()
    {
        GameStateMediator.Instance.SendSetIntentMsg(Intent.MOVE);
    }
}
