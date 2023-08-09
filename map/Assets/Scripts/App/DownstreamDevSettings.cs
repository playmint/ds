#if UNITY_EDITOR

using UnityEditor;
using UnityEngine;

[FilePath("Playmint/DownstreamDevSettings.cfg", FilePathAttribute.Location.PreferencesFolder)]
public class DownstreamDevSettings : ScriptableSingleton<DownstreamDevSettings>
{
    [SerializeField]
    public string NodePath = "/path/to/node";

    [SerializeField]
    public string NPXPath = "/path/to/npx";

    [SerializeField]
    public string Network = "local";

    [SerializeField]
    public string PrivateKey = "0xcbb2a15db088c93ffebb60c57ee7d2d82e75e21711a4d34529219e1e167a7aa5";

    public void SaveSettings()
    {
        Save(true);
    }
}

#endif
