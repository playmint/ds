# Downstream Game Creation Tutorial 7

## Aim
We will follow the steps below to learn about the <b>ZoneKind</b>

<img src="./readme-images/screenshot.png" width=600>

## 1. Setup
If you've followed the previous tutorials, you will already be familiar with setting up your own map.

If not, then I recommend that you first complete these tutorials: 
- [tutorial-room-1](https://github.com/playmint/ds/blob/main/contracts/src/maps/tutorial-room-1/README.md)
  - to learn how to set up your map
- [tutorial-room-4](https://github.com/playmint/ds/blob/main/contracts/src/maps/tutorial-room-4/README.md)
  - to learn how to colour tiles

## 2. Create a map
Enter the [tile-fabricator](http://localhost:3000/tile-fabricator) and draw the map like this:

<img src="../tutorial-room-1/readme-images/step3.png" width=200>

Now that we're on `tutorial-room-7`, we are going to draw this over the `tutorial-room-1` area.

## 3. Zone files
To implement the ZoneKind, you need to create these files:
- Zone.yaml
- Zone.sol
- Zone.js

## Zone.yaml
Here is how I've setup the `Zone.yaml` file for this tutorial:
```yaml
---
kind: ZoneKind
spec:
  name: tutorial-room-7
  description: This zone shows off what you can do with a ZoneKind
  url: images/building-totems/Block_Van.png
  contract:
    file: ./Zone.sol
  plugin:
    file: ./Zone.js
```

We can use this to predefine the zone's name, description, and image URL.

When the zone is deployed, this shows up on the zone select page:

<img src="./readme-images/zone-select.png" width=600>

We're also using the yaml file to implement logic to our zone.

## Zone.js
In this example, `Zone.js` is just being used to colour the tiles:
```js
const z = hexToSignedDecimal(state.world.key);
    const middleCoords = [z, 0, 7, -7];
    const allRoomTiles = getTilesInRange(middleCoords, 3);
    const walkableTiles = getWalkableTilesInRange(middleCoords, 3);
    allRoomTiles.forEach((tileId) => {
        if (walkableTiles.includes(tileId)) {
            map.push({
                type: "tile",
                key: "color",
                id: tileId,
                value: "#32B25A",
            });
        } else {
            map.push({
                type: "tile",
                key: "color",
                id: tileId,
                value: "#EC5C61",
            });
        }
    });
```

I'm using similar helper function as we used to create the dico room ([tutorial-room-4](https://github.com/playmint/ds/blob/main/contracts/src/maps/tutorial-room-4/README.md)), but with some slight modifications to create a walkable path, represented by green tiles, and an unwalkable path, represented by red tiles.

As you can see in this modified function:
```js
function getWalkableTilesInRange(middleCoords, range) {
    const [z, q, r, s] = middleCoords;
    let tilesInRange = [];
    for (let dx = -range; dx <= range; dx++) {
        for (
            let dy = Math.max(-range, -dx - range);
            dy <= Math.min(range, -dx + range);
            dy++
        ) {
            const dz = -dx - dy;
            const theseCoords = [z, q + dx, r + dy, s + dz];
            if (theseCoords[1] == 0 || theseCoords[2] == 7 || theseCoords[3] == -7) {
                const tileId = getTileIdFromCoords([z, q + dx, r + dy, s + dz]);
                tilesInRange.push(tileId);
            }            
        }
    }
    return tilesInRange;
}
```

It only pushes the tile to the list if it matches a certain coord.

## Zone.sol
Take a look at the example `Zone.sol` file and you will notice that it may look similar to a BuildingKind solidity file.

There are however some new concepts being used here that we haven't yet covered.

In our example, we'll setup the file like this:
```solidity
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State, CompoundKeyDecoder} from "cog/IState.sol";
import {Schema, CombatWinState} from "@ds/schema/Schema.sol";
import {ZoneKind} from "@ds/ext/ZoneKind.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

contract Zone is ZoneKind { 
    ...
```

We're importing `ZoneKind` so we can make use of the built-in hooks.



I've predefined a list of tile IDs that we're going to use to stop units from walking on them:

```solidity
    bytes24[18] public unwalkableTiles;

    constructor() {
        unwalkableTiles = [
            bytes24(0xe5a62ffc0000000000000000000000000001fffd0008fffb),
            bytes24(0xe5a62ffc0000000000000000000000000001fffd0009fffa),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe0006fffc),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe0008fffa),
            bytes24(0xe5a62ffc0000000000000000000000000001fffe000afff8),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0005fffc),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0006fffb),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff0009fff8),
            bytes24(0xe5a62ffc0000000000000000000000000001ffff000afff7),
            bytes24(0xe5a62ffc000000000000000000000000000100010004fffb),
            bytes24(0xe5a62ffc000000000000000000000000000100010005fffa),
            bytes24(0xe5a62ffc000000000000000000000000000100010008fff7),
            bytes24(0xe5a62ffc000000000000000000000000000100010009fff6),
            bytes24(0xe5a62ffc000000000000000000000000000100020004fffa),
            bytes24(0xe5a62ffc000000000000000000000000000100020006fff8),
            bytes24(0xe5a62ffc000000000000000000000000000100020008fff6),
            bytes24(0xe5a62ffc000000000000000000000000000100030005fff8),
            bytes24(0xe5a62ffc000000000000000000000000000100030006fff7)
        ];
    }
```

We're using a `constructor` to set the `unwalkableTiles` array values.

The way I created this list in the first place, was by making code in `Zone.js` that compiled the tile IDs of the unwalkable tiles that could be copy & pasted straight into the solidity code:
```js
// // code to compile unwalkable tile IDs
    // let string = "unwalkableTiles = [\n";
    // printThese.forEach((tileId) => {
    //     string += "bytes24(" + tileId + "),\n";
    // });
    // string += "];";
    // console.log(string);
```
In the example `Zone.js` file, uncomment this bit of the code as well as:
```js
//printThese.push(tileId);
```
to have the tile IDs printed to the browser's developer console.

`ZoneKind` allows us to hook in to particular events and execute logic when something happens.

See all the hooks we can use here: https://github.com/playmint/ds/blob/main/contracts/src/ext/ZoneKind.sol

In our example, we're using:
- use
- onCombatStart
- onUnitArrive

### onUnitArive
```solidity
    function onUnitArrive(Game ds, bytes24 /*zoneID*/, bytes24 mobileUnitID) external override {
        State state = ds.getState();

        bytes24 tile = state.getNextLocation(mobileUnitID);
        (, int16 q, int16 r, int16 s) = getTileCoords(tile);

        bool canWalkHere = true;
        for (uint256 i = 0; i < unwalkableTiles.length; i++) {
            (, int16 q2, int16 r2, int16 s2) = getTileCoords(unwalkableTiles[i]);
            if (q == q2 && r == r2 && s == s2) {
                canWalkHere = false;
                break;
            }
        }
        require(canWalkHere, "Zone logic is stopping you from walking here");
    }
```
This code checks where the unit is trying to move to. If they're trying to move to a tile that exists in the `unwalkableTiles` array, the movement will not be allowed.

In our case, this is all the red tiles. Once you've implemented this, you can apply the map, and notice the unit will skip over the red tiles.

### onCombatStart
```solidity
    function onCombatStart(Game /*ds*/, bytes24 /*zoneID*/, bytes24 /*mobileUnitID*/, bytes24 /*sessionID*/) external pure override {
        revert("Combat is disabled in this zone");
    }
```
Because we have access to this hook, we can do things like removing combat in a zone, or perhaps limiting combat based on game logic. In this example, we're simply disabling combat as a whole.

With this implemented, when a unit tries to enter combat in this zone, nothing will happen:

<img src="./readme-images/unattackable.png" width=300>

### use
The ZoneKind has the unique ability to be able to access "dev" actions. Which are some of the actions that are used during the `ds apply`/`ds destroy` commands like spawning and removing buildings and tiles.

For the zone, instead of dispatching `BUILDING_USE`, we dispatch `ZONE_USE`, and it interacts with the zone's solidity logic.

We've added this function:
```solidity
    function toggleUnwalkableTiles(bytes24 b) external {}
```
Which we're going to use to call `DEV_SPAWN_TILE`/`DEV_DESTROY_TILE` on all the `unwalkableTiles`.

```solidity
function use(Game ds, bytes24, /*zoneID*/ bytes24, /*mobileUnitID*/ bytes calldata payload) public override {
        State state = ds.getState();
        if ((bytes4)(payload) == this.toggleUnwalkableTiles.selector) {
            // Getting zone using buildingInstance
            (bytes24 buildingInstance) = abi.decode(payload[4:], (bytes24));
            bytes24 buildingTile = state.getFixedLocation(buildingInstance);
            (int16 z,,,) = getTileCoords(buildingTile);

            for (uint256 i = 0; i < unwalkableTiles.length; i++) {
                bytes24 tile = unwalkableTiles[i];
                (, int16 q, int16 r, int16 s) = getTileCoords(tile);
                if (showingWalkableTiles) {
                    ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_DESTROY_TILE, (z, q, r, s)));
                } else {
                    ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (z, q, r, s)));
                }
            }

            showingWalkableTiles = !showingWalkableTiles;
        }
    }
```

Note see what function was passed in via the payload:
```solidity
if ((bytes4)(payload) == this.toggleUnwalkableTiles.selector)
```

This is being dispatched from `Unattackable.js`:
```js
const toggleUnwalkableTiles = () => {
        const mobileUnit = getMobileUnit(state);
        if (!mobileUnit) {
            console.log("no selected unit");
            return;
        }

        const payload = ds.encodeCall("function toggleUnwalkableTiles(bytes24)", [
            selectedBuilding.id,
        ]);

        ds.dispatch({
            name: "ZONE_USE",
            args: [mobileUnit.id, payload],
        });
    };
```

Here you can see the use of `ZONE_USE`.

(View the example code to create a simple building with a button if you haven't already)

Now, when the button on this building is clicked, the tiles either get spawned, or destroyed:

<img src="./readme-images/toggle-tiles.png" width=600>