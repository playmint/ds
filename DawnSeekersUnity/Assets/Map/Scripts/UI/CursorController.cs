using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class CursorController : MonoBehaviour
{
    public static Texture2D cursorTexture;
    public static CursorMode cursorMode = CursorMode.Auto;
    public static Vector2 hotSpot = Vector2.zero;

    private void Awake()
    {
        cursorTexture = Resources.Load<Texture2D>("moveCursor");
        hotSpot = new Vector2(16, 16);
    }

    public static void ShowMoveCursor()
    {
        Cursor.SetCursor(cursorTexture, hotSpot, cursorMode);
    }

    public static void ShowDefaultCursor()
    {
        // Pass 'null' to the texture parameter to use the default system cursor.
        Cursor.SetCursor(null, Vector2.zero, cursorMode);
    }
}
