using UnityEditor;
using UnityEngine;
using UnityEditor.Build;
using System.Linq;
using System;
using System.IO;
using System.Collections.Generic;

public class BuildScript
{
    //Github actions build
    [MenuItem("Playmint/Build/Pipeline Test")]
    static void GitHubBuild()
    {
        var scenes = GetScenesFromBuildSettings();
        //MoveJson();
        PlayerSettings.WebGL.threadsSupport = false;
        EditorUserBuildSettings.il2CppCodeGeneration = Il2CppCodeGeneration.OptimizeSize;
        BuildPipeline.BuildPlayer(
            scenes,
            "../frontend/public/ds-unity",
            BuildTarget.WebGL,
            BuildOptions.None
        );
    }

    static void DevBuild()
    {
        var scenes = GetScenesFromBuildSettings();
        //MoveJson();
        PlayerSettings.WebGL.threadsSupport = false;
        EditorUserBuildSettings.il2CppCodeGeneration = Il2CppCodeGeneration.OptimizeSize;
        BuildPipeline.BuildPlayer(
            scenes,
            "../frontend/public/ds-unity",
            BuildTarget.WebGL,
            BuildOptions.Development
        );
    }

    [MenuItem("Playmint/Build/Copy Deployments")]
    static void MoveJson()
    {
        var list = new List<string> { "mumbai.json", "rinkeby.json", "ganache.json" };
        foreach (var file in list)
        {
            string path = "../blockchain/solidity/deployments/" + file;
            string path2 = "Assets/Resources/Deployments/" + file;

            if (!File.Exists(path))
            {
                using (FileStream fs = File.Create(path)) { }
            }

            if (File.Exists(path2))
                File.Delete(path2);

            File.Copy(path, path2);
        }
    }

    [MenuItem("Playmint/Build/Delete Testnet Deployments")]
    static void DeleteJson()
    {
        var list = new List<string> { "mumbai.json", "rinkeby.json" };
        foreach (var file in list)
        {
            string path = "../blockchain/solidity/deployments/" + file;
            string path2 = "Assets/Resources/Deployments/" + file;

            if (File.Exists(path))
                File.Delete(path);

            if (File.Exists(path2))
                File.Delete(path2);
        }
    }

    private static string[] GetScenesFromBuildSettings()
    {
        return (
            from scene in EditorBuildSettings.scenes
            where scene.enabled
            select scene.path
        ).ToArray();
    }

    static void WebGLThreadDisable()
    {
        PlayerSettings.WebGL.threadsSupport = false;
    }

    static void WebGLThreadEnable()
    {
        PlayerSettings.WebGL.threadsSupport = true;
    }
}
