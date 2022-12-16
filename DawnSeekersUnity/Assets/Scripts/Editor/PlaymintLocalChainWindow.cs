using UnityEngine;
using UnityEditor;
using System.Collections;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;

    class LocalChain : EditorWindow {
        
    bool profileSwitch;
    string profile;
    string[] deployment = {"../blockchain/solidity/deployments/ganache.json", "Assets/Resources/Deployments/ganache.json", "Assets/Resources/Deployments/ganache.json.meta"};
    
    [MenuItem ("Playmint/Local Chain")]
    public static void  ShowWindow () {
        var e = EditorWindow.GetWindow(typeof(LocalChain));

            if(e.position.height <= 0 || 
                e.position.width <= 0 || 
                e.position.x < 0 || e.position.y < 0
            ) {
                e.position.Set(50, 50, 500, 500);
                e.Close();
                e.position.Set(50, 50, 500, 500);
            }
    }

    void OnGUI () {

        //Windows start local chain button
        if(GUILayout.Button("Windows Local Chain"))
        {
            UnityEngine.Debug.Log("Deployment type: " + profile);

            var path = Application.dataPath + "/../../";
            var file = "localChain.bat";
            UnityEngine.Debug.Log("File path: " + path + file + " Profile: " + profile);
            System.Diagnostics.Process.Start(path + file, profile.ToString());
        }

        //OSX start local chain button
        if(GUILayout.Button("OSX Local Chain"))
        {
            using (var proc = new Process ()) 
            {
                UnityEngine.Debug.Log("Deployment type: " + profile);

                var path = Application.dataPath;
                var scriptPath = path + "/../..";
                var script = "localChain.sh";

                Process process = new Process();

                process.StartInfo.FileName = "osascript";
                process.StartInfo.Arguments = string.Format("-e 'tell application \"Terminal\" to do script \"cd {0} && ./{1} {2} \"'", scriptPath, script, profile);
                process.StartInfo.UseShellExecute = false;
                process.StartInfo.Verb = "runas";
 
                process.Start();
                process.WaitForExit();
                process.Close();
            }
        }

        
        //Debug mode toggle
        profileSwitch = EditorGUILayout.ToggleLeft("Dev mode", profileSwitch);
        if(profileSwitch)
            profile = "hard";
        else
            profile = "easy";
    }
}