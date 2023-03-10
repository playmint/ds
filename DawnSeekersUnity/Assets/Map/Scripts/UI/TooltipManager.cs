using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;

public class TooltipManager : MonoBehaviour
{
    public static TooltipManager instance;

    [SerializeField]
    Transform tooltipParent;
    [SerializeField]
    TextMeshProUGUI tooltipText;

    float disappearTimer = 0;
    float disappearAlarm = 0.1f;

    private void Awake()
    {
        instance = this;
    }

    private void Start()
    {
        HideTooltip();
    }

    public void ShowTooltip(string text)
    {
        tooltipText.text = text;
        tooltipParent.gameObject.SetActive(true);
        disappearTimer = 0;
    }

    public void HideTooltip()
    {
        tooltipParent.gameObject.SetActive(false);
    }

    private void Update()
    {
        if(tooltipParent.gameObject.activeSelf)
        {
            tooltipParent.position = Input.mousePosition;
            disappearTimer += Time.deltaTime;
            if(disappearTimer> disappearAlarm)
            {
                HideTooltip();
            }
        }
    }
}
