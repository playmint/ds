using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class GooController : MonoBehaviour
{
    [SerializeField]
    private GameObject big;

    [SerializeField]
    private GameObject small;

    // protected void Awake()
    // {
    //     big = GameObject.Find("big");
    //     if (big == null)
    //     {
    //         Debug.LogError("Unable to find goo prefab with name 'big'");
    //     }

    //     small = GameObject.Find("small");
    //     if (small == null)
    //     {
    //         Debug.LogError("Unable to find goo prefab with name 'big'");
    //     }

    //     Hide();
    // }

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
