using UnityEngine;
using UnityEditor;
using Cog;

public class IntentsEditorWindow : EditorWindow
{
    [MenuItem("Playmint/Player Intents")]
    public static void ShowWindow()
    {
        GetWindow<IntentsEditorWindow>("Player Intents");
    }

    private void OnGUI()
    {
        bool isPlaying = EditorApplication.isPlaying && !EditorApplication.isPaused;
        bool disableButtons = !isPlaying;

        if (
            isPlaying
            && GameStateMediator.Instance != null
            && GameStateMediator.Instance.gameState != null
        )
        {
            disableButtons = GameStateMediator.Instance.gameState.Selected.Seeker == null;
        }

        EditorGUI.BeginDisabledGroup(disableButtons);

        GUILayout.BeginVertical();
        if (disableButtons)
            GUILayout.Label("No Unit Selected");
        else if (SeekerManager.instance.currentSelectedSeeker != null)
            GUILayout.Label("Selected Seeker: " + SeekerManager.instance.currentSelectedSeeker.Id);
        GUILayout.Space(10f);
        GUILayout.BeginHorizontal();
        GUILayout.Space(10f);

        if (GUILayout.Button("Construct", GUILayout.Height(50f)))
        {
            IntentClick("construct");
        }

        GUILayout.Space(10f);

        if (GUILayout.Button("Move", GUILayout.Height(50f)))
        {
            IntentClick("move");
        }

        GUILayout.Space(10f);

        if (GUILayout.Button("Scout", GUILayout.Height(50f)))
        {
            IntentClick("scout");
        }

        GUILayout.Space(10f);

        if (GUILayout.Button("Use", GUILayout.Height(50f)))
        {
            IntentClick("use");
        }

        GUILayout.Space(10f);

        if (GUILayout.Button("Combat", GUILayout.Height(50f)))
        {
            //IntentClick("Kick their ass, sea bass!");
        }

        GUILayout.Space(10f);
        GUILayout.EndHorizontal();
        GUILayout.Space(10f);

        if (GUILayout.Button("Confirm", GUILayout.Height(50f)))
        {
            MapInteractionManager.instance.MapClicked2();
            //IntentClick("scout");
        }
        GUILayout.EndVertical();
        GUILayout.Space(10f);

        EditorGUI.EndDisabledGroup();
    }

    void IntentClick(string intent)
    {
        if (GameStateMediator.Instance.gameState.Selected.Intent == intent)
        {
            // Cancel intent if already in intent for this button
            GameStateMediator.Instance.SendSetIntentMsg(IntentKind.NONE);
        }
        else
        {
            GameStateMediator.Instance.SendSetIntentMsg(intent);
        }
    }
}
