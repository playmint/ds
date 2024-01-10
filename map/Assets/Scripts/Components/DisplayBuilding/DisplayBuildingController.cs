using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using TMPro;
using UnityEngine;

public class DisplayBuildingController : BaseComponentController<DisplayBuildingData>
{
    [SerializeField]
    private Color highlightColor;
    [SerializeField]
    GameObject displayObj, countdownObj;

    [SerializeField]
    TextMeshPro displayText, countdownText;

    [SerializeField]
    Animator countDownAnim;

    public Material redOutlineMat,
        greenOutlineMat;

    protected void Update()
    {
        if (_prevData == _nextData)
        {
            return;
        }

        if (_nextData.model != null)
        {
            if (
                _prevData == null
                || _nextData.model != _prevData.model
            )
            {
                if (_nextData.model == "countdown")
                    countdownObj.SetActive(true);
                else
                    displayObj.SetActive(true);
            }

            if (_nextData.labelText != _prevData?.labelText)
            {
                if (_nextData.model == "countdown")
                {
                    countdownText.text = _nextData.labelText;
                    if (countdownText.text=="00:00")
                    {
                        countDownAnim.speed = 1f;
                        countDownAnim.Play("Timer_Complete");
                    }
                    else
                    {
                        Debug.Log(_nextData.startTime);
                        countDownAnim.speed = 0f;
                        countDownAnim.Play("Timer_Clock", 0, _nextData.startTime);
                    }
                    
                }
                else
                    displayText.text = _nextData.labelText;
            }
        }

        

        Vector3Int cubeCoords = new Vector3Int(_nextData.q, _nextData.r, _nextData.s);
        Vector3 worldPos = CoordsHelper.CubeToWorld(cubeCoords);
        transform.position = new Vector3(worldPos.x, _nextData.height, worldPos.z);
        transform.GetChild(0).localEulerAngles = new Vector3(0, _nextData.rotation, 0);

        _prevData = _nextData;
    }
}
