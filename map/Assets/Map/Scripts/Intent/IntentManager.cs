using UnityEngine;
using System.Linq;

public class IntentManager : MonoBehaviour
{
    public static IntentManager Instance;

    private IntentHandler[] _intentHandlers;

    protected void Awake()
    {
        Instance = this;
        _intentHandlers = GetComponentsInChildren<IntentHandler>();
    }

    public bool IsHandledIntent(string intent)
    {
        return _intentHandlers.FirstOrDefault(intentHandler => intentHandler.Intent == intent)
            != null;
    }
}
