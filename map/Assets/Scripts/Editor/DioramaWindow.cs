using UnityEditor;
using UnityEngine;
using UnityEditor.UIElements;
using UnityEngine.UIElements;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using System;

public class DioramaWindow : EditorWindow
{
    Button playPause;
    PopupField<string> picker;

    private int _idx = 0;
    private IDiorama? _currentScript;
    private List<Dictionary<string, object>>? _steps = new();
    private string? _description = "";

    private Dictionary<string, object> _currentState = new();

    private bool _isLooping = false;

    private Task? _loop;

    [MenuItem("Window/Dioramas")]
    public static void ShowDiaramaControls()
    {
        DioramaWindow wnd = GetWindow<DioramaWindow>();
        wnd.titleContent = new GUIContent("Diorama Controls");
    }

    public void Awake()
    {
        _currentState = new Dictionary<string, object>();
    }

    public void CreateGUI()
    {
        VisualElement root = rootVisualElement;
        var dioramas = GetAllDioramas();

        Label label = new Label("No Diorama Selected");
        root.Add(label);

        List<string> choices = new() { };
        dioramas.ForEach(d =>
        {
            if (d == null)
            {
                return;
            }
            choices.Add(d.GetType().Name);
        });
        IDiorama? initialDiorama = dioramas.FirstOrDefault();
        if (initialDiorama != null)
        {
            Load(initialDiorama);
        }
        picker = new PopupField<string>("Diorama", choices, "EmptyDiorama");
        picker.RegisterCallback<ChangeEvent<string>>((evt) =>
        {
            if (evt.newValue == "")
            {
                return;
            }
            IDiorama? script = dioramas.Where(d => d?.GetType().Name == evt.newValue).FirstOrDefault();
            if (script == null)
            {
                Debug.Log("failed to find diorama script: {evt.newValue}");
                return;
            }
            Load(script);
            label.text = script.GetDescription();
        });
        root.Add(picker);

        playPause = new()
        {
            name = "play",
            text = "Play",
        };
        playPause.RegisterCallback<ClickEvent>((ClickEvent evt) =>
        {
            Debug.Log("click");
            if (_loop != null)
            {
                Debug.Log("stopping");
                StopLoop();
                playPause.text = "Play";
            }
            else
            {
                if (!EditorApplication.isPlaying)
                {
                    EditorApplication.EnterPlaymode();
                }
                Debug.Log("starting");
                PlayLoop();
                playPause.text = "Pause";
            }
        });
        root.Add(playPause);

        // Slider scrubber = new(0f, 100f);
        // root.Add(scrubber);
    }

    List<IDiorama?> GetAllDioramas()
    {
        // TODO: filter out junk to prevent debug noise
        return AppDomain.CurrentDomain.GetAssemblies()
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

    void Update()
    {
        if (!EditorApplication.isPlaying)
        {
            return;
        }
        // scale = EditorGUILayout.Slider(scale, 1, 100);
    }

    public async void PlayLoop()
    {
        if (_loop != null)
        {
            return;
        }

        ComponentManager manager = GameObject.Find("ComponentManager").GetComponent<ComponentManager>();
        await manager.Ready();

        _loop = LoopForever();
        _isLooping = true;
    }

    public async void StopLoop()
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

    private async Task LoopForever()
    {
        Debug.Log("Waiting for ready");
        ComponentManager manager = GameObject.Find("ComponentManager").GetComponent<ComponentManager>();
        await manager.Ready();
        Debug.Log("ready");

        Debug.Log("Start");
        for (; ; )
        {
            await Task.Delay(1000);

            Debug.Log("Tick");

            if (!_isLooping)
            {
                Debug.Log("not looping");
                return;
            }

            if (!EditorApplication.isPlaying)
            {
                _isLooping = false;
                _loop = null;
                playPause.text = "Play";
                Debug.Log("not playing");
                return;
            }

            Dictionary<string, object> step = GetNextState();

            // call Set on any components we have data for
            foreach (var keyPair in step)
            {
                var instanceId = keyPair.Key;
                if (keyPair.Value is not TileData data)
                {
                    continue;
                }
                ComponentDataMessage msg = new()
                {
                    type = "Tile",
                    id = instanceId,
                    data = JsonUtility.ToJson(data)
                };
                var jsonMsg = JsonUtility.ToJson(msg);
                Debug.Log($"Set {jsonMsg}");
                manager.SetComponent(jsonMsg); // use the json version to test it
                _currentState[instanceId] = data;
            }

            // find any components that need removing
            List<string> toRemove = new List<string>();
            foreach (var keyPair in _currentState)
            {
                var instanceId = keyPair.Key;
                var data = keyPair.Value;
                if (!step.ContainsKey(instanceId))
                {
                    toRemove.Add(instanceId);
                }
            }
            // ... and remove them
            foreach (var instanceId in toRemove)
            {
                if (_currentState.ContainsKey(instanceId))
                {
                    ComponentMessage msg = new()
                    {
                        type = "Tile",
                        id = instanceId,
                    };
                    var jsonMsg = JsonUtility.ToJson(msg);
                    Debug.Log($"Remove {jsonMsg}");
                    manager.RemoveComponent(jsonMsg); // use the json version to test it
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
        _description = script.GetDescription();
    }

    public Dictionary<string, object> GetNextState()
    {
        if (_steps == null || _steps.Count == 0)
        {
            Debug.Log("no step data");
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
