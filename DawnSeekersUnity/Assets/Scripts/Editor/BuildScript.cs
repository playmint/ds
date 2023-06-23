using UnityEditor;
using UnityEditor.Build;
using System.Linq;

public class BuildScript
{
    //Github actions build
    [MenuItem("Playmint/Build/Production")]
    static void GitHubBuild()
    {
        var scenes = GetScenesFromBuildSettings();
        PlayerSettings.WebGL.threadsSupport = false;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.None;
        EditorUserBuildSettings.il2CppCodeGeneration = Il2CppCodeGeneration.OptimizeSize;
        BuildPipeline.BuildPlayer(
            scenes,
            "../frontend/public/ds-unity",
            BuildTarget.WebGL,
            BuildOptions.None
        );
    }

    [MenuItem("Playmint/Build/Debug")]
    static void DevBuild()
    {
        var scenes = GetScenesFromBuildSettings();
        PlayerSettings.WebGL.threadsSupport = false;
        PlayerSettings.WebGL.exceptionSupport = WebGLExceptionSupport.FullWithStacktrace;
        EditorUserBuildSettings.il2CppCodeGeneration = Il2CppCodeGeneration.OptimizeSize;
        BuildPipeline.BuildPlayer(
            scenes,
            "../frontend/public/ds-unity",
            BuildTarget.WebGL,
            BuildOptions.Development
        );
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
