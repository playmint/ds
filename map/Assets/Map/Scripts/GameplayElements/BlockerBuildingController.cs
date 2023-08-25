using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;

public class BlockerBuildingController : MapElementController
{
    [SerializeField]
    GameObject[] buildingModels;

    [SerializeField]
    GameObject[] outlineModels;

    public void Setup(Vector3Int cell, Transform parent, string id, string model)
    {
        Setup(cell, parent, id);
        if (model == "enemy")
        {
            buildingModels[0].SetActive(true);
            outlineObjs = new GameObject[1];
            outlineObjs[0] = outlineModels[0];
        }
        buildingModels.FirstOrDefault(m => m.name == model).SetActive(true);
        outlineObjs = new GameObject[1];
        outlineObjs[0] = outlineModels.FirstOrDefault(m => m.name == model);
    }
}
