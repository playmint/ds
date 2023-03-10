using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class ActionMenuButtonController : MonoBehaviour
{
    public void ButtonClicked()
    {
        SeekerMovementManager.instance.ActivateMovementMode();
    }
}
