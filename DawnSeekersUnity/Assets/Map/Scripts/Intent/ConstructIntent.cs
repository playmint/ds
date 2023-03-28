using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using System.Linq;
using Cog;

public class ConstructIntent : MonoBehaviour
{
    public static ConstructIntent instance;

    private void Awake()
    {
        instance = this;
    }

    private bool isValidConstructionTile()
    {
        return true;
    }
}
