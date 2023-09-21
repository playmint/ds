using System.Runtime.InteropServices;
using Unity.VisualScripting;
using UnityEngine;
using UnityEngine.EventSystems;
using ColorUtility = UnityEngine.ColorUtility;

public class GroundPlaneController : BaseComponentController<GroundPlaneData>
{
    [SerializeField]
    private Renderer rend;
    [SerializeField]
    AnimationCurve popInCurve;

    private float _t;
    private Transform? _camTrans;
    private Vector3 _offset = Vector3.zero;
    private string _defaultMatColor = "#445C84";
    private float _defaultHeight =-0.4f;

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }
        if (_camTrans == null)
        {
            _camTrans = Camera.main.transform;
            transform.localEulerAngles = Vector3.zero;
            _offset.y = _nextData.height;
        }

        _t += Time.deltaTime*5;
        ColorUtility.TryParseHtmlString(_nextData.color == null || _nextData.color == "" ? _defaultMatColor : _nextData.color, out Color col);

        if (col == null)
        {
            Debug.Log($"invalid color {_nextData.color} falling back to {_defaultMatColor}");
            ColorUtility.TryParseHtmlString(_defaultMatColor, out col);
        }
        var currentColor = _prevData == null
            ? col
            : rend.material.color;

        
        rend.material.color = Color.Lerp(
                    currentColor,
                    col,
                    popInCurve.Evaluate(_t)
                );

        if(_prevData != null)
            _offset.y = Mathf.Lerp(_prevData.height, _nextData.height, popInCurve.Evaluate(_t));

        if (_t>1)
        {
            _t = 0;
            _prevData = _nextData;
        }
    }

    private void LateUpdate()
    {
        if (_camTrans == null)
            return;
        transform.position =
            new Vector3(
                _camTrans.position.x,
                0,
                _camTrans.position.z
            ) + _offset;
    }
}
