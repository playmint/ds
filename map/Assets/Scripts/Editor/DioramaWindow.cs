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

    public bool isLooping = false;

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

        List<string> choices = new() { "choose..." };
        picker = new PopupField<string>("Diorama", choices, 0);
        picker.RegisterCallback<ChangeEvent<string>>((evt) =>
        {
            IDiorama? script = dioramas.Where(d => d?.GetType().Name == evt.newValue).FirstOrDefault();
            if (script == null)
            {
                Debug.Log("failed to find diorama script: {evt.newValue}");
                return;
            }
            Load(script);
        });
        dioramas.ForEach(d =>
        {
            if (d == null)
            {
                return;
            }
            picker.choices.Add(d.GetType().Name);
        });
        root.Add(picker);

        Label label = new Label("Diorama!");
        root.Add(label);

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
                Debug.Log("starting");
                PlayLoop();
                playPause.text = "Pause";
            }
        });
        root.Add(playPause);

        Slider scrubber = new(0f, 100f);
        root.Add(scrubber);
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
        if (!Application.isPlaying)
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
        isLooping = true;
    }

    public async void StopLoop()
    {
        if (_loop == null)
        {
            return;
        }
        isLooping = false;
        await _loop;
        return;
    }

    private async Task LoopForever()
    {
        Debug.Log("Waiting for ready");
        await ComponentManager.instance.Ready();
        Debug.Log("ready");

        Debug.Log("Start");
        for (; ; )
        {
            await Task.Delay(1000);

            Debug.Log("Tick");

            if (!isLooping)
            {
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
                ComponentManager.instance.Set(jsonMsg); // use the json version to test it
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
                    ComponentManager.instance.Remove(jsonMsg); // use the json version to test it
                    _currentState.Remove(instanceId);
                }
            }
            await Task.Delay(1000);
        }
    }

    public void Load(IDiorama script)
    {
        // reset
        _idx = 0;
        _steps = script.GetStates();
        _description = script.GetDescription();
    }

    public Dictionary<string, object> GetNextState()
    {
        if (_steps == null || _steps.Count == 0)
        {
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
