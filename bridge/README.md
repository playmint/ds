# DawnSeekersBridge

This project is needed to allow for the map to be run outside of the shell. It's job is simply to act as a proxy between `DawnseekersClient` and Unity.

## To build

```
npm ci
npm run build
```

## To run

This module is designed to be run by Unity but it can be run on the command line with either

`npm run start`

or directly as typescript when debugging:

`npm run start:dev`

This will build to `bridge/build`. This is the path used by `PluginController.cs` in Unity to start the process in a separate thread. (see `NodeProcessThread()` in `PluginController`)

## Output

Dawnseekers bridge handles the state update events from the Dawnseekers client, removes circular references from the object, serialises the state as JSON and outputs it on stdout which is read by Unity. A replacer function is used to replace the BigInts in the original state object with hex strings.

## Input

Dawnseekers bridge will also monitor stdin for JSON message objects which allow Unity to update the UI state with the `selectTile` message and modify the game state with the `dispatch` message.

### Message object

An example of a message object

```javascript
{
    msg: 'dispatch',
    action: "MOVE_MOBILE_UNIT",
    args: [
        0,
        -1,
        0
    ]
}
```
