using System.Collections;
using System.Collections.Generic;
using Cog;
using UnityEngine;

public class GooController : MonoBehaviour
{
    [SerializeField]
    private GameObject big;

    [SerializeField]
    private GameObject small;

    public void Setup(bool isBig)
    {
        big.SetActive(isBig);
        small.SetActive(!isBig);
        transform.Rotate(0, Random.Range(0,12)*30.0f, 0);
    }

    public void Hide()
    {
        big.SetActive(false);
        small.SetActive(false);
    }
}
