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

    bool isBig;

    public void Setup(bool isBig)
    {
        this.isBig = isBig;
        Show();
        transform.Rotate(0, Random.Range(0, 12) * 30.0f, 0);
    }

    public void Show()
    {
        big.SetActive(isBig);
        small.SetActive(!isBig);
    }

    public void Hide()
    {
        big.SetActive(false);
        small.SetActive(false);
    }
}
