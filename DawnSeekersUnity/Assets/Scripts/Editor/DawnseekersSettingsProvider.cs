using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

class DawnseekersSettingsProvider : SettingsProvider
{
    SerializedObject SerialisedSettings;
    SerializedProperty NodePath;
    SerializedProperty PrivateKey;

    private class Styles
    {
        public static readonly GUIContent NodePathLabel = EditorGUIUtility.TrTextContent("NodePath", "Node Path");
        public static readonly GUIContent PrivateKeyLabel = EditorGUIUtility.TrTextContent("PrivateKey", "Private Key");
    }

    public DawnseekersSettingsProvider(string path, SettingsScope scopes, IEnumerable<string> keywords = null)
        : base(path, scopes, keywords) { }

    public override void OnActivate(string searchContext, VisualElement rootElement)
    {
        Debug.Log("DawnseekersSettingsProvider::OnActivate()");
        // MySingleton.instance.Save();
        SerialisedSettings = new SerializedObject(DawnseekersDevSettings.instance);
        NodePath = SerialisedSettings.FindProperty("NodePath");
        PrivateKey = SerialisedSettings.FindProperty("PrivateKey");
    }

    public override void OnGUI(string searchContext)
    {
        using (CreateSettingsWindowGUIScope())
        {
            SerialisedSettings.Update();
            EditorGUI.BeginChangeCheck();

            EditorGUILayout.LabelField("Node Absolute Path");
            NodePath.stringValue = EditorGUILayout.TextField(NodePath.stringValue);

            EditorGUILayout.LabelField("Private Key");
            PrivateKey.stringValue = EditorGUILayout.TextField(PrivateKey.stringValue);

            if (EditorGUI.EndChangeCheck())
            {
                SerialisedSettings.ApplyModifiedProperties();
                DawnseekersDevSettings.instance.SaveSettings();
            }
        }
    }

    [SettingsProvider]
    public static SettingsProvider CreateMySingletonProvider()
    {
        var provider = new DawnseekersSettingsProvider("Project/Dawnseekers", SettingsScope.Project, GetSearchKeywordsFromGUIContentProperties<Styles>());
        return provider;
    }

    private IDisposable CreateSettingsWindowGUIScope()
    {
        var unityEditorAssembly = Assembly.GetAssembly(typeof(EditorWindow));
        var type = unityEditorAssembly.GetType("UnityEditor.SettingsWindow+GUIScope");
        return Activator.CreateInstance(type) as IDisposable;
    }
}