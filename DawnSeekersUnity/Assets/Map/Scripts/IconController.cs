using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class IconController : MonoBehaviour
{
    Transform _trans, _camTrans;

    private void Awake()
    {
        _trans = transform;
        _camTrans = Camera.main.transform;
    }

    private void LateUpdate()
    {
        _trans.rotation = _camTrans.rotation;
    }
}
