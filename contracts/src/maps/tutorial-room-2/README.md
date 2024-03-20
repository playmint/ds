# tutorial-room-2 provides examples on:
- Bags with containing items 
- Doors that require a certain item to open 
- An enemy to fight 

## Build the map - Choose how you want to build:
### With Docker: 
`MAP=tutorial-room-2 docker compose up`

### With `make dev`:
`MAP=tutorial-room-2 make dev` 

### With `ds apply`:
`ds apply -k [YOUR_KEY] -n local -R -f contracts/src/maps/tutorial-room-2` 

For more info on building, see: https://github.com/playmint/ds/blob/main/tutorial/README.md

## Bags & Items
In this tutorial, there is a key in the bag near the entrance. We've defined the key item in `DoorUnlockinator3000.yaml`, which makes it available to be placed in a bag as can be seen in `Bags.yaml`.

## Using Items with the Door Logic

In this tutorial, we're using the key item to determin whether or not the door should be open and passable.

We check to see if the unit has the key in the inventory:
```js
const hasGateKey = getItemBalance(mobileUnit, keyItemName, bags) > 0;
```

We can stop or allow the unit from passing a tile:
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