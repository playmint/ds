using System;
using UnityEngine;

public class AppController : MonoBehaviour
{
    // RemoteLoadPath is referenced in the Addressables profile It works out the
    // absolute root URL of the current page when running in browser. We do this
    // so that we don't need to bake in the absolute URL of streaming assets
    public static string RemoteLoadPath
    {
        get
        {
            Uri u = new Uri(Application.absoluteURL);
            string port = u.Port != 80 ? $":{u.Port}" : "";
            return $"{u.Scheme}://{u.Host}{port}";
        }
    }

    void Start()
    {
#if !UNITY_EDITOR && UNITY_WEBGL
    // disable WebGLInput.captureAllKeyboardInput so elements in web page can handle keyboard inputs
    WebGLInput.captureAllKeyboardInput = false;
#endif
    }
}
