using System;
using System.Collections.Generic;
using System.Reflection;
using UnityEditor;
using UnityEngine;
using UnityEngine.UIElements;

class DownstreamSettingsProvider : SettingsProvider
{
    SerializedObject SerialisedSettings;
    SerializedProperty NodePath;
    SerializedProperty NPXPath;
    SerializedProperty Network;
    SerializedProperty PrivateKey;

    private class Styles
    {
        public static readonly GUIContent NodePathLabel = EditorGUIUtility.TrTextContent(
            "NodePath",
            "Node Path"
        );
        public static readonly GUIContent NPXPathLabel = EditorGUIUtility.TrTextContent(
            "NPXPath",
            "NPX Path"
        );
        public static readonly GUIContent NetworkLabel = EditorGUIUtility.TrTextContent(
            "Network",
            "Network"
        );
        public static readonly GUIContent PrivateKeyLabel = EditorGUIUtility.TrTextContent(
            "PrivateKey",
            "Private Key"
        );
    }

    public DownstreamSettingsProvider(
        string path,
        SettingsScope scopes,
        IEnumerable<string> keywords = null
    )
        : base(path, scopes, keywords) { }

    public override void OnActivate(string searchContext, VisualElement rootElement)
    {
        SerialisedSettings = new SerializedObject(DownstreamDevSettings.instance);
        NodePath = SerialisedSettings.FindProperty("NodePath");
        NPXPath = SerialisedSettings.FindProperty("NPXPath");
        Network = SerialisedSettings.FindProperty("Network");
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

            EditorGUILayout.LabelField("NPX Absolute Path");
            NPXPath.stringValue = EditorGUILayout.TextField(NPXPath.stringValue);

            EditorGUILayout.LabelField("Network (local, devnet, testnet)");
            Network.stringValue = EditorGUILayout.TextField(Network.stringValue);

            EditorGUILayout.LabelField("Private Key");
            PrivateKey.stringValue = EditorGUILayout.TextField(PrivateKey.stringValue);

            if (EditorGUI.EndChangeCheck())
            {
                SerialisedSettings.ApplyModifiedProperties();
                DownstreamDevSettings.instance.SaveSettings();
            }
        }
    }

    [SettingsProvider]
    public static SettingsProvider CreateMySingletonProvider()
    {
        var provider = new DownstreamSettingsProvider(
            "Project/Downstream",
            SettingsScope.Project,
            GetSearchKeywordsFromGUIContentProperties<Styles>()
        );
        return provider;
    }

    private IDisposable CreateSettingsWindowGUIScope()
    {
        var unityEditorAssembly = Assembly.GetAssembly(typeof(EditorWindow));
        var type = unityEditorAssembly.GetType("UnityEditor.SettingsWindow+GUIScope");
        return Activator.CreateInstance(type) as IDisposable;
    }
}
