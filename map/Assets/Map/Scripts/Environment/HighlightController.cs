using System;
using System.Collections;
using UnityEngine;
using UnityEngine.EventSystems;
using System.Runtime.InteropServices;

[Serializable]
public class HighlightData
{
    public string id;
    public int q;
    public int r;
    public int s;
}

public class HighlightController : MonoBehaviour
{

    public HighlightData data;

}
