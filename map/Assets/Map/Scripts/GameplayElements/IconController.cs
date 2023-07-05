using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;
using UnityEngine.Rendering;

public class IconController : MonoBehaviour
{
    [SerializeField]
    private SpriteRenderer _iconRenderer;

    [SerializeField]
    private TextMeshPro counter;

    [SerializeField]
    SortingGroup sortingGroup;

    private Transform _camTrans,
        _iconParent;

    private float iconHeightOffset = 0.15f;
    private float _iconHOffset = 0;

    private int _sortingOrder;
    private bool _iconEnabled,
        _counterEnabled;

    private void Awake()
    {
        _camTrans = Camera.main.transform;
    }

    private void LateUpdate()
    {
        transform.position =
            _iconParent.position
            + (Vector3.up * -iconHeightOffset)
            + (Vector3.right * _iconHOffset);
        transform.rotation = _camTrans.rotation;
    }

    public void Setup(Transform iconParent)
    {
        _iconParent = iconParent;
    }

    public void DestroyIcon()
    {
        Destroy(gameObject);
    }

    public void PrepareIcon(int index, int numObjects)
    {
        _iconHOffset = index > 0 ? 0.025f : 0;
        _sortingOrder = 10 - index;
        _iconEnabled = numObjects == 1;
        _counterEnabled = numObjects > 1 && index == 0;
        counter.text = numObjects.ToString();
    }

    public void UpdateIcon()
    {
        sortingGroup.sortingOrder = _sortingOrder;
        _iconRenderer.enabled = _iconEnabled;
        counter.enabled = _counterEnabled;
    }
}
