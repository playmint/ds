using UnityEngine;

public class BuildingHelper
{
    public static uint GetBuildingCategory(string id)
    {
        string categoryHex = "0x" + id.Substring(id.Length - 2);
        uint category = System.Convert.ToUInt32(categoryHex, 16);
        return category;
    }
}
