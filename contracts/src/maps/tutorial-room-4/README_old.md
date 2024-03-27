# Tutorial Room 4

This tutorial provides examples on:
- Changing tiles colours
- Changing unit costumes
- Custom (building) plugin UI
- Billboards

## Changing Tile Colours

Tile colours are being controlled by the `DiscoCentre.js` plugin.

In this example, there are two states the "dance floor" can be in. 
1. The default state changes all the tiles within a radius to blue, except for the tile your unit is stood on.

2. When in disco mode, every tile in the radius is changes to a random colour from a predefined list.

In the code, we've started by setting the tile the unit is stood on to orange.

First we need the coordinates of the unit (which we'll also use to calculate the tile ID), and the Disco Centre coordinates, so we can calculate the distance between the two:
```js
const buildingTileCoords = getTileCoords(discoCentre?.location?.tile?.coords);
const unitTileCoords = getTileCoords(mobileUnit?.nextLocation?.tile?.coords);
const unitDistanceFromBuilding = distance(buildingTileCoords, unitTileCoords);
```

With this information we can set the colour value for the tile the unit is standing on:
```js
if (unitDistanceFromBuilding <= TILE_COLOUR_DISTANCE) {
    // Orange tile under the unit
    map.push({
        type: 'tile',
        key: 'color',
        id: getTileIdFromCoords(unitTileCoords),
        value: '#f58c02',
    });
}
```

(See `DiscoCentre.js` if you'd like to understand what the functions used are doing)

We've implemented a function that gets an array of all the tiles within a range, `getTilesInRange`. To set the colours of all these tiles, we loop through them, and either give them a random colour, or turn them all blue - except for the one the unit is standing on:
```js
if (disco) {
            getTilesInRange(discoCentre, TILE_COLOUR_DISTANCE).forEach((t) => {
                if (t !== unitTileId) {
                    map.push(
                        {
                            type: "tile",
                            key: "color",
                            id: `${t}`,
                            value: themedRandomColour(),
                        }
                    );
                }      
            });
        }else{
            getTilesInRange(discoCentre, TILE_COLOUR_DISTANCE).forEach((t) => {
                if (t !== unitTileId) {
                    map.push(
                        {
                            type: "tile",
                            key: "color",
                            id: `${t}`,
                            value: '#3386d4',
                        }
                    );
                }      
            });
        }
```

Note that we've been adding these maps to the `map` array. Once we've done this for all our logic, the plugin should include it in the return as seen here:
```js
return {
        version: 1,
        map: map,
        components: [
            {
                id: 'colour-controller',
                type: 'building',
                content: [
                    {
                        id: 'default',
                        type: 'inline',
                        html: '<p>Let\'s party!</p>',
                        buttons: buttons,
                    },
                ],
            },
        ],
    };
```

## Changing Unit Costumes
Similarly to chanding tile colours, we can also change unit models.

We get our unit ID:
```js
function getMobileUnit(state) {
    return state?.selected?.mobileUnit;
}
```

And set the value of the unit's model - based on some variables:
```js
if (dressed){
            if (unitDistanceFromBuilding <= TILE_COLOUR_DISTANCE){
                // Change unit model
                map.push({
                    type: "unit",
                    key: "model",
                    id: mobileUnit.id,
                    value: `Unit_Tuxedo_0${selectedTux}`,
                });
            }
        }
```

## Custom (Building) Plugin UI

How is the player able to control things like toggling the disco dance floor mode, and what tuxedo the unit is wearing?

The plugin allows you to create custom HTML so you can display whatever you like, or in this case, add clickable buttons that call functions to trigger logic.

For exmaple, this is a button that calls the `toggleDressed` function:
```js
buttons.push({
            text: dressed ? 'Remove Tuxedo 🙎‍♂️' : 'Wear Tuxedo 🤵',
            type: 'action',
            action: toggleDressed,
            disabled: false,
        });
```

`toggleDressed` is toggling the bool `dressed`.
```js
const toggleDressed = () => {
    dressed = !dressed;
};
```

So we can use the players input to change what's happening in the world.

## Billboards

The Disco Billboard has been added through `DiscoBillboard.yaml`:
```yaml
---
kind: BuildingKind
spec:
  category: billboard
  name: Disco Billboard
  description: Beavers!
  model: monitor
  plugin:
    file: ./DiscoBillboard.js
    alwaysActive: true
  materials:
  - name: Red Goo
    quantity: 10
  - name: Green Goo
    quantity: 10
  - name: Blue Goo
    quantity: 10
```

You should note:
- `category: billboard`
- `alwaysActive: true`

These are required for billboards to function.

Again, similar to how we change tile colours, and unit models, we set values in a map, passing through the billboard building ID, and an image URL to set the image:
```js
    const map = [
        {
        type: "building",
        key: "image",
        id: `${discoBillboard.id}`,
        value: images[selectedImg],
        },
    ];
```

Custom plugin UI is also being utilised here to allow the player to change the image being displayed on the billboard.