using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class GooController : MonoBehaviour
{
    [SerializeField]
    private GameObject big;

    [SerializeField]
    private GameObject small;

    public void ShowBig()
    {
        big.SetActive(true);
        small.SetActive(false);
    }

    public void ShowSmall()
    {
        small.SetActive(true);
        big.SetActive(false);
    }

    public void Hide()
    {
        big.SetActive(false);
        small.SetActive(false);
    }
}
