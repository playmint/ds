# Tutorial Room 2

This tutorial provides examples on:
- Bags with containing items 
- Doors that require a certain item to open 
- An enemy to fight 

## Building the Map

Choose your preferred method to build:

### With Docker: 
Run the following command: 
```
MAP=tutorial-room-2 docker compose up
```

### With `make dev`:
Run the following command: 
```
MAP=tutorial-room-2 make dev
``` 

### With `ds apply`:
Run the following command: 
```
ds apply -k [YOUR_KEY] -n local -R -f contracts/src/maps/tutorial-room-2
``` 

For more information on building, see the [building guide](https://github.com/playmint/ds/blob/main/tutorial/README.md).

## Bags & Items

In this tutorial, a key is placed in the bag near the entrance. The key item is defined in `DoorUnlockinator3000.yaml`, which makes it available to be placed in a bag as seen in `Bags.yaml`.

## Using Items with Door Logic

We use the key item to determine whether the door should be open and passable.

The unit's inventory is checked for the key:
```js
const hasGateKey = getItemBalance(mobileUnit, keyItemName, bags) > 0;
```

We can prevent or allow the unit from passing a tile:
```js
const blockerTileMapObjs = pluginBuildingTileIDs.map((t) => {
        return {
            type: "tile",
            key: "blocker",
            id: t,
            value: `${!hasGateKey}`,
        };
    });
```

And change the door model to opened/closed:
```js
const buildingModelMapObjs = pluginBuildings.map((t) => {
        return {
            type: "building",
            key: "model",
            id: t.id,
            value: hasGateKey ? "door-open-1" : "door-closed-1",
        };
    });
```

## Enemy & Combat

Once you're through the door, the "Squisher" (sword) item can be found in the bag. You'll notice in `Squisher.yaml`: `stackable: false`. When a non-stackable item is in a unit's inventory, it uses the item's goo values to add to the wielding unit's combat stats.
- Red Goo adds attack
- Blue Goo adds defence
- Green Goo adds life

The enemy "Mr. Squishy" is defined in `MrSquishy.yaml`. Unit's can enter combat with things on the map.

See `SquishyGate.js` for the rest of the logic