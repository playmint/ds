using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class MapHeightManager : MonoBehaviour
{
    public static MapHeightManager instance;

    [SerializeField]
    float heightScale = 1;
    [SerializeField]
    float heightFrequency = 0.25f;

    private void Awake()
    {
        if(instance == null)
        {
            instance = this;
        }
        else
        {
            Destroy(gameObject);
        }
    }

    void Start()
    {
        Random.InitState(1000);
    }

    public float GetHeightAtPosition(Vector3 position)
    {
        return Mathf.PerlinNoise(position.x * heightFrequency, position.y * heightFrequency);
    }

    public Vector3 GetHeightOffsetAtPosition(Vector3 position)
    {
        return Vector3.forward * Mathf.PerlinNoise(position.x * heightFrequency, position.y * heightFrequency);
    }
}
