using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;

public class ExtractorBuildingController : MapElementController
{
    [SerializeField]
    private Color _red;

    [SerializeField]
    private Color _green;

    [SerializeField]
    private Color _blue;

    private Color _gooColor;

    public void Setup(Vector3Int cell, Transform parent, string id, string model)
    {
        Setup(cell, parent, id);
        setColor(model);
    }

    protected void Update()
    {
        foreach (Renderer rend in renderers)
        {
            rend.material.SetColor("_BaseColor", _gooColor);
        }
    }

    private void setColor(string color)
    {
        switch (color)
        {
            case "red":
                _gooColor = _red;
                break;
            case "green":
                _gooColor = _green;
                break;
            case "blue":
                _gooColor = _blue;
                break;
        }
    }
}
