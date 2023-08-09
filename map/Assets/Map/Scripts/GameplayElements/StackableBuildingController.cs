using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;

public class StackableBuildingController : MapElementController
{
    [SerializeField]
    GameObject defaultPrefab;

    [SerializeField]
    Transform[] stackPositions;

    [SerializeField]
    private GameObject[] totemPrefabs;

    public void Setup(Vector3Int cell, Transform parent, string id, string[] stackCodes)
    {
        if (stackCodes != null)
        {
            GetTotemPrefabs(stackCodes);
        }
        else
        {
            GetDefaultBuilding();
        }
        Setup(cell, parent, id);
    }

    private void GetTotemPrefabs(string[] stackCodes)
    {
        renderers = new Renderer[2];
        outlineObjs = new GameObject[2];
        for (int i = 0; i < 2; i++)
        {
            renderers[i] = Instantiate(
                    totemPrefabs.FirstOrDefault(n => n.name == stackCodes[i]),
                    stackPositions[i]
                )
                .GetComponentInChildren<Renderer>();

            outlineObjs[i] = renderers[i].transform.GetChild(0).gameObject;
        }
    }

    private void GetDefaultBuilding()
    {
        renderers = new Renderer[1];
        renderers[0] = Instantiate(defaultPrefab, stackPositions[0])
            .GetComponentInChildren<Renderer>();
        outlineObjs = new GameObject[1] { renderers[0].transform.GetChild(0).gameObject };
    }
}
