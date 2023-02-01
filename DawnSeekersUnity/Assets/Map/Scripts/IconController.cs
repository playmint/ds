using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;

public class IconController : MonoBehaviour
{
    [SerializeField]
    private SpriteRenderer _iconRenderer;
    [SerializeField]
    private TextMeshPro _label;

    private Transform _trans, _camTrans;

    private void Awake()
    {
        _trans = transform;
        _camTrans = Camera.main.transform;
    }

    private void LateUpdate()
    {
        _trans.rotation = _camTrans.rotation;
    }

    public void Setup(Sprite sprite, string label)
    {
        _iconRenderer.sprite = sprite;
        _label.text = label;
    }

    public void DestroyIcon()
    {
        Destroy(gameObject);// TODO: Add pooling
    }
}
