using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using Cog;
using UnityEngine;

[Serializable]
public class SelectionData
{
    public string id;
    public int q;
    public int r;
    public int s;
}

public class HighlightManager : MonoBehaviour
{
    public static HighlightManager instance;

    public Color scoutColor,
        normalColor;
    public MaterialPropertyBlock dynamicMatProps;
    public MaterialPropertyBlock unscoutedMatProps;
    public MaterialPropertyBlock normalMatProps;

    Dictionary<Vector3Int, SelectionData> tilePositions = new Dictionary<Vector3Int, SelectionData>();
    Dictionary<string, SelectionData> tilePositions2 = new Dictionary<string, SelectionData>();

    private void Awake()
    {
        instance = this;
    }

    public void SetJSON(string json)
    {
        SelectionData data = JsonUtility.FromJson<SelectionData>(json);
        Set(data);
    }

    public void Set(SelectionData data)
    {
        tilePositions2[data.id] = data;
    }

    public void Remove(string id)
    {
        tilePositions2.Remove(id);
    }

}
