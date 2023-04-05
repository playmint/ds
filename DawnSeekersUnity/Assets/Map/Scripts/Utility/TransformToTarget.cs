using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class TransformToTarget : MonoBehaviour
{
    Transform _trans;
    [SerializeField]
    Transform target;
    [SerializeField]
    Vector3 positionMask;
    [SerializeField]
    Vector3 offset;
    private void Awake()
    {
        _trans = transform;
    }

    private void LateUpdate()
    {
        _trans.position = new Vector3(target.position.x * positionMask.x, target.position.y * positionMask.y, target.position.z * positionMask.z) + offset;
    }
}
