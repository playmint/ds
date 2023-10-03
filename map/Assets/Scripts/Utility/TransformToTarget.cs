using UnityEngine;

public class TransformToTarget : MonoBehaviour
{
    Transform? _trans;

    [SerializeField]
    Transform? target;

    [SerializeField]
    Vector3 positionMask;

    [SerializeField]
    Vector3 offset;

    protected void Awake()
    {
        _trans = transform;
    }

    private void LateUpdate()
    {
        if (_trans == null)
        {
            return;
        }
        if (target == null)
        {
            return;
        }
        _trans.position =
            new Vector3(
                target.position.x * positionMask.x,
                target.position.y * positionMask.y,
                target.position.z * positionMask.z
            ) + offset;
    }
}
