using UnityEditor;
using UnityEngine;
using UnityEditor.UIElements;
using UnityEngine.UIElements;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System;

[InitializeOnLoadAttribute]
public class DioramaWindow : EditorWindow
{
    PopupField<string> picker;
    private Label? description;

    private static int _idx = 0;
    private static IDiorama? _currentScript;
    private static List<Dictionary<string, BaseComponentData>>? _steps = new();

    private static readonly Dictionary<string, BaseComponentData> _currentState;

    private static bool _isLooping = false;

    private static Task? _loop;

    private static string? _fallbackDioramaName = "EmptyDiorama";
    private static string? _initialDioramaName = "EmptyDiorama";

    static DioramaWindow()
    {
        _currentState = new Dictionary<string, BaseComponentData>();
        EditorApplication.playModeStateChanged += OnPlayModeStateChange;
    }

    [MenuItem("Window/Dioramas")]
    public static void ShowDiaramaControls()
    {
        DioramaWindow wnd = GetWindow<DioramaWindow>();
        wnd.titleContent = new GUIContent("Diorama Controls");
    }

    private static void OnPlayModeStateChange(PlayModeStateChange state)
    {
        switch (state)
        {
            case PlayModeStateChange.ExitingEditMode:
                break;
            case PlayModeStateChange.EnteredPlayMode:
                PlayLoop();
                break;
            case PlayModeStateChange.ExitingPlayMode:
                StopLoop();
                break;
            case PlayModeStateChange.EnteredEditMode:
                break;
        }
    }

    protected void OnEnable()
    {
        if (EditorPrefs.HasKey("selectedDiorama"))
        {
            _initialDioramaName = EditorPrefs.GetString("selectedDiorama", _fallbackDioramaName);
        }
    }

    public void CreateGUI()
    {
        VisualElement root = rootVisualElement;

        // info about the loaded diorama
        description = new("");
        root.Add(description);

        // load list of all classes that implement IDiorama into selectbox
        var dioramas = GetAllDioramas();
        List<string> choices = new() { };
        dioramas.ForEach(d =>
        {
            if (d == null)
            {
                return;
            }
            choices.Add(d.GetType().Name);
        });

        // try to load the last viewed diorama, or fallback to the empty diorama
        IDiorama? initialDiorama = dioramas
            .Where(d => d?.GetType().Name == _initialDioramaName)
            .FirstOrDefault();
        if (initialDiorama == null)
        {
            initialDiorama = dioramas
                .Where(d => d?.GetType().Name == _fallbackDioramaName)
                .FirstOrDefault();
        }
        if (initialDiorama == null)
        {
            throw new Exception("expected to find a diorama called {_initialDioramaName}");
        }
        Load(initialDiorama);

        // show the diorama picker
        picker = new PopupField<string>("Diorama", choices, initialDiorama.GetType().Name);
        picker.RegisterCallback<ChangeEvent<string>>(
            (evt) =>
            {
                if (evt.newValue == "")
                {
                    return;
                }
                IDiorama? script = dioramas
                    .Where(d => d?.GetType().Name == evt.newValue)
                    .FirstOrDefault();
                if (script == null)
                {
                    Debug.Log("failed to find diorama script: {evt.newValue}");
                    return;
                }
                Load(script);
                EditorPrefs.SetString("selectedDiorama", script.GetType().Name);
            }
        );
        root.Add(picker);
    }

    List<IDiorama?> GetAllDioramas()
    {
        // TODO: filter out junk to prevent debug noise
        return AppDomain.CurrentDomain
            .GetAssemblies()
            .SelectMany(assembly => assembly.GetTypes())
            .Where(t => typeof(IDiorama).IsAssignableFrom(t))
            .Select(t =>
            {
                try
                {
                    return Activator.CreateInstance(t) as IDiorama;
                }
                catch (Exception err)
                {
                    Debug.Log($"failed to load {t.GetType().Name}: {err}");
                    return null;
                }
            })
            .ToList();
    }

    private static async void PlayLoop()
    {
        if (_loop != null)
        {
            Debug.Log("already play");
            return;
        }

        Debug.Log("play");
        ComponentManager manager = GameObject
            .Find("ComponentManager")
            .GetComponent<ComponentManager>();
        await manager.Ready();

        _loop = LoopForever();
        _isLooping = true;
    }

    private static async void StopLoop()
    {
        if (_loop == null)
        {
            return;
        }
        _isLooping = false;
        await _loop;
        _loop = null;
        return;
    }

    private static async Task LoopForever()
    {
        ComponentManager manager = GameObject
            .Find("ComponentManager")
            .GetComponent<ComponentManager>();
        await manager.Ready();

        for (; ; )
        {
            await Task.Delay(1000);

            Debug.Log("Tick");

            if (!_isLooping)
            {
                Debug.Log("stopping diorama");
                return;
            }

            if (!EditorApplication.isPlaying)
            {
                _isLooping = false;
                _loop = null;
                Debug.Log("editor not playing, stopping diorama");
                return;
            }

            Dictionary<string, BaseComponentData> step = GetNextState();

            // call Set on any components we have data for
            foreach (var keyPair in step)
            {
                var instanceId = keyPair.Key;
                BaseComponentData data = keyPair.Value;
                ComponentDataMessage msg =
                    new()
                    {
                        type = data.GetTypeName(),
                        id = instanceId,
                        data = JsonUtility.ToJson(data)
                    };
                var jsonMsg = JsonUtility.ToJson(msg);
                Debug.Log($"Set {jsonMsg}");
                manager.SetComponent(jsonMsg);
                _currentState[instanceId] = data;
            }

            // find any components that need removing
            List<string> toRemove = new List<string>();
            foreach (var keyPair in _currentState)
            {
                var instanceId = keyPair.Key;
                BaseComponentData data = keyPair.Value;
                if (!step.ContainsKey(instanceId))
                {
                    ComponentMessage msg = new() { type = data.GetTypeName(), id = instanceId, };
                    var jsonMsg = JsonUtility.ToJson(msg);
                    Debug.Log($"Remove {jsonMsg}");
                    manager.RemoveComponent(jsonMsg);
                    // mark to remove from local state
                    toRemove.Add(instanceId);
                }
            }
            // ... and remove them
            foreach (var instanceId in toRemove)
            {
                if (_currentState.ContainsKey(instanceId))
                {
                    _currentState.Remove(instanceId);
                }
            }
            await Task.Delay(1000);
        }
    }

    public void Load(IDiorama script)
    {
        Debug.Log("loaded");
        // reset
        _idx = 0;
        _steps = script.GetStates();
        description.text = script.GetDescription();
    }

    public static Dictionary<string, BaseComponentData> GetNextState()
    {
        if (_steps == null || _steps.Count == 0)
        {
            Debug.Log("no diorama data, select a diorama from window->dioramas");
            return new();
        }
        _idx = _idx + 1;
        if (_idx >= _steps.Count)
        {
            _idx = 0;
        }
        return _steps[_idx];
    }
}
