using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MapElementManager : MonoBehaviour
{
    public static MapElementManager instance;

    [SerializeField]
    private GameObject buildingPrefab,
        bagPrefab,
        enemyPrefab;

    private void Awake()
    {
        instance = this;
    }

    public void CreateBuilding(Vector3Int cubicCoords)
    {
        if (!GameObject.Find("Building_" + cubicCoords.ToString()))
        {
            MapElementController building = Instantiate(buildingPrefab, transform, true)
                .GetComponent<MapElementController>();
            building.gameObject.name = "Building_" + cubicCoords.ToString();
            building.Setup(cubicCoords);
        }
    }

    public void CreateEnemy(Vector3Int cubicCoords)
    {
        if (!GameObject.Find("Building_" + cubicCoords.ToString()))
        {
            MapElementController building = Instantiate(enemyPrefab, transform, true)
                .GetComponent<MapElementController>();
            building.gameObject.name = "Building_" + cubicCoords.ToString();
            building.Setup(cubicCoords);
        }
    }

    public void CreateBag(Vector3Int cubicCoords)
    {
        if (!GameObject.Find("Bag_" + cubicCoords.ToString()))
        {
            MapElementController bag = Instantiate(bagPrefab, transform, true)
                .GetComponent<MapElementController>();
            bag.gameObject.name = "Bag_" + cubicCoords.ToString();
            bag.Setup(cubicCoords);
        }
    }

    public int IsElementAtCell(Vector3Int cubicCoords)
    {
        if (GameObject.Find("Building_" + cubicCoords.ToString())) // || GameObject.Find("Bag_" + cubicCoords.ToString()))
            return 1;
        else
            return 0;
    }

    public void CheckBagIconRemoved(Vector3Int cubicCoords)
    {
        GameObject bag = GameObject.Find("Bag_" + cubicCoords.ToString());
        if (bag != null)
        {
            bag.GetComponent<MapElementController>().DestroyMapElement();
        }
    }

    public void CheckBuildingIconRemoved(Vector3Int cubicCoords)
    {
        GameObject building = GameObject.Find("Building_" + cubicCoords.ToString());
        if (building != null)
        {
            building.GetComponent<MapElementController>().DestroyMapElement();
        }
    }

    public IconController CreateIcon(Transform iconParent, GameObject iconPrefab)
    {
        IconController icon;
        icon = Instantiate(iconPrefab, transform, true).GetComponent<IconController>();
        icon.Setup(iconParent);
        return icon;
    }

    public static Vector3 GetPositionOnCircle(float radius, int numObjects, int index)
    {
        float angle = (float)index / numObjects * 360f;
        angle += 240;
        float x = radius * Mathf.Sin(angle * Mathf.Deg2Rad);
        float z = radius * Mathf.Cos(angle * Mathf.Deg2Rad);
        float y = 0;
        return new Vector3(x, y, z);
    }
}
