using UnityEngine;

public class AppController : MonoBehaviour
{
    void Start()
    {
#if !UNITY_EDITOR && UNITY_WEBGL
    // disable WebGLInput.captureAllKeyboardInput so elements in web page can handle keyboard inputs
    WebGLInput.captureAllKeyboardInput = false;
#endif
    }
}
