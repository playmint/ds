using System.Collections;
using System.Collections.Generic;
using Cinemachine;
using UnityEngine;

public class GenerateImpulse : MonoBehaviour
{
    CinemachineImpulseSource source;

    [SerializeField]
    float force;

    private void Awake()
    {
        source = GetComponent<CinemachineImpulseSource>();
    }

    private void Start()
    {
        source.GenerateImpulseAt(transform.position, Vector3.up * force);
    }
}
