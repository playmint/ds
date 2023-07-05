using System.Collections;
using System.Collections.Generic;
using TMPro;
using UnityEngine;

public class FocusTester : MonoBehaviour
{
    TextMeshProUGUI _text;

    private void Awake()
    {
        _text = GetComponent<TextMeshProUGUI>();
    }

    // Update is called once per frame
    void Update()
    {
        if (Application.isFocused == true)
            _text.text = "Has Focus";
        else
            _text.text = "Lost Focus";
    }
}
