# Downstream Game Creation Tutorial 6

## Aim

We will follow the steps below to create a simple downstream map with a building that can spawn and control a Mobile Unit

<img src="./readme-images/screenshot.png" width=300>

## Prerequisites

-   This repository cloned to your desktop. (Instructions in the top [readme](../../../../README.md).)
-   [Docker Desktop](https://docs.docker.com/get-docker/)
-   [npm](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

## 1. Preparation

Before starting, ensure that you have deployed an instance of Downstream locally using Docker. You can find instructions on how to do that in [Tutorial 1 here](../tutorial-room-1/README.md).

Make a folder to contain the files that will comprise the map for this tutorial e.g. `/Tutorial6Map`

## 2. Create a new 'custom' building

To begin, create the following three files to represent our new kind of building - `UnitController.js`, `UnitController.sol` and `UnitController.yaml`.

Next past the following starter code into each of the 3 files

`UnitController.js`

```js
import ds from "downstream";

export default async function update(state) {
    const mobileUnit = getMobileUnit(state);
    const selectedTile = getSelectedTile(state);
    const selectedBuilding =
        selectedTile && getBuildingOnTile(state, selectedTile);

    if (!selectedBuilding || !mobileUnit) {
        return {
            version: 1,
            components: [],
        };
    }

    const spawnUnit = () => {};

    return {
        version: 1,
        components: [
            {
                id: "tutorial-6",
                type: "building",
                content: [
                    {
                        id: "default",
                        type: "inline",
                        html: ``,

                        buttons: [
                            {
                                text: "Spawn Unit",
                                type: "action",
                                action: spawnUnit,
                            },
                        ],
                    },
                ],
            },
        ],
    };
}

function getMobileUnit(state) {
    return state?.selected?.mobileUnit;
}

function getSelectedTile(state) {
    const tiles = state?.selected?.tiles || {};
    return tiles && tiles.length === 1 ? tiles[0] : undefined;
}

function getBuildingOnTile(state, tile) {
    return (state?.world?.buildings || []).find(
        (b) => tile && b.location?.tile?.id === tile.id,
    );
}
```

`UnitController.sol`

```solidity
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema, Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";

using Schema for State;

contract UnitController is BuildingKind {
    function spawnUnit() external {}

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes calldata payload) public override {
        if ((bytes4)(payload) == this.spawnUnit.selector) {
            _spawnUnit(ds, buildingInstance);
        }
    }

    function _spawnUnit(Game ds, bytes24 buildingInstance) internal {}
}

```

`UnitController.yaml`

```yaml
---
kind: BuildingKind
spec:
    category: custom
    name: Unit Controller
    description: This Building can spawn and control a mobile unit
    model: 01-01
    color: 2
    contract:
        file: ./UnitController.sol
    plugin:
        file: ./UnitController.js
    materials:
        - name: Red Goo
          quantity: 10
        - name: Green Goo
          quantity: 10
        - name: Blue Goo
          quantity: 10
```

## 3. Implement the code to spawn a unit

The previous start code includes a button to 'Spawn Unit' however the function that is called is currently empty so let's start by writing the code that will call into the building's contract.

`UnitController.js`

```js
const spawnUnit = () => {
    const payload = ds.encodeCall("function spawnUnit()", []);

    ds.dispatch({
        name: "BUILDING_USE",
        args: [selectedBuilding.id, mobileUnit.id, payload],
    });
};
```

The contract doesn't yet do anything so next we are going to implement the code to actually spawn a unit.

`UnitController.sol`

```solidity
    function _spawnUnit(Game ds, bytes24 buildingInstance) internal {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, ()));
    }
```

This will spawn units at the default location of `0,0,0` however it would be a lot better if the units spawned next to our unit controller building. To Achieve this we are going to decode the location of the building instance and move the unit one tile to east of it.

First we need a helper to decode the location. Paste the following at the end of the contract

`UnitController.sol`

```solidity
    function _getTileCoords(bytes24 tile) public pure returns (int16 z, int16 q, int16 r, int16 s) {
        z = int16(int192(uint192(tile) >> 48));
        q = int16(int192(uint192(tile) >> 32));
        r = int16(int192(uint192(tile) >> 16));
        s = int16(int192(uint192(tile)));
    }
```

The coordinates are encoded in a tile ID so we're able to decode them by simply bit shifting the `int16` values.

Next we call the helper function and move the unit to the east by offsetting the `q, r, s` coordinates by `+1, 0, -1`

`UnitController.sol`

```solidity
    function _spawnUnit(Game ds, bytes24 buildingInstance) internal {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, ()));

        // Move mobile unit next to the building
        (int16 z, int16 q, int16 r, int16 s) = _getTileCoords(ds.getState().getFixedLocation(buildingInstance));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (z, q + 1, r, s - 1)));
    }
```

## 4. See what we have done so far in action

It's now a good point to see if what we have made is actually working as expected. Let's make a quick map using the **Tile Fabricator**. If you're unfamiliar with the Tile Fabricator, take a look at step 3 of [Tutorial 1 here](../tutorial-room-1/README.md).

Open [http://localhost:3000/tile-fabricator] and sketch out a map of the following shape.

<img src="./readme-images/step4a.png" width=200>

We next want to place our building on the map. We haven't deployed it yet so it won't appear in the brush list however we can import the `UnitController.yaml` file to allow us to place it on the map. Simply click the 'Import' button in the Tile Fabricator and choose the `UnitController.yaml` file in our map folder i.e `/Tutorial6Map`

Select the 'Unit Controller' from the brush list and place on the map.

<img src="./readme-images/step4b.png" width=200>

We'll now export the tiles, rename the output yaml to `Locations.yaml` and move the file to our map folder i.e. `/Tutorial6Map`

With the map tiles defined and the building location set we can now deploy our map using the cli tool and see the results of our work. If you're unfamiliar with the cli tool or how to obtain the private key from your burner wallet, please look at step 4 in [Tutorial 1 here](../tutorial-room-1/README.md).

Run the following from the root of your map folder

```bash
ds apply -n local -z 1 -k <private-key> -R -f .
```

If we now refresh Open [http://localhost:3000/zones/1] we will see our map with our Unit Controller building on it. To spawn a unit from the building we'll first need to spawn our own unit and walk up to the building in order to interact with the building's UI.

<img src="./readme-images/step4c.png" width=200>

## 5. Control the Unit spawned from the building

### Get references to all units that have been spawned from the building

So far we have managed to spawn a Unit to the east of our building however we cannot move it. Let's first get a reference to that Unit by using the following code pasted after the `spawnUnit` function from earlier.

`UnitController.js`

```js
...
const { mobileUnits } = state.world;

// We slice the last 40 characters (20 bytes) from the ids which is the address
const buildingUnit = mobileUnits.find(
    (unit) =>
        unit.owner.id.slice(-40) ===
        selectedBuilding.kind.implementation.id.slice(-40),
);
...
```

We destructure the world object to get at all the Units in the world and then compare the owner addresses with the address of our building contract. As it was the building contract that spawned the Unit, the unit is inherently owned by that contract.

### Add buttons to move the units

Next we want to actually move the unit we have found so let's first add a button to move the Unit one tile to the North East.

`UnitController.js`

```js
    return {
...
                        buttons: [
                            {
                                text: "Spawn Unit",
                                type: "action",
                                action: spawnUnit,
                                disabled: buildingUnit,
                            },
                            {
                                text: "Move Unit ↗️",
                                type: "action",
                                action: moveNE,
                                disabled: !buildingUnit,
                            },
                        ]
...
```

## 6. Add a function that calls into the contract

We have specified we are calling `moveNE` as the button's action so we need to declare it.

`UnitController.js`

```js
...
    const moveNE = () => {
        const payload = ds.encodeCall("function moveUnitNE()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };
...
```

## 7. Implement the movement code in the contract

The js plugin is currently calling into our contract but we have yet to implement the function that does the movement. First we need to decode the `moveUnitNE` function call we dispatched from the plugin.

`UnitController.sol`

```solidity
contract UnitController is BuildingKind {
    function spawnUnit() external {}
    function moveUnitNE() external {}

    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes calldata payload) public override {
        if ((bytes4)(payload) == this.spawnUnit.selector) {
            _spawnUnit(ds, buildingInstance);
        } else if ((bytes4)(payload) == this.moveUnitNE.selector) {
            _moveUnit(ds, [int16(0), int16(1), int16(-1)]);
        }
    }
...
```

Please note that we have added the `function moveUnitNE() external {}` function signature to the beginning of the contract. This is used when decoding the function that was passed in via the payload.

Next we implement the `_moveUnit` function that actually does the movement

`UnitController.sol`

```solidity
    function _moveUnit(Game ds, int16[3] memory direction) internal {
        (int16 z, int16 q, int16 r, int16 s) = _getUnitCoords(ds);
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (z, q + direction[0], r + direction[1], s + direction[2]))
        );
    }

    function _getUnitCoords(Game ds) internal returns (int16 z, int16 q, int16 r, int16 s) {
        bytes24 mobileUnit = Node.MobileUnit(address(this));
        State state = ds.getState();
        bytes24 tile = state.getCurrentLocation(mobileUnit, uint64(block.number));
        return _getTileCoords(tile);
    }
```

We are moving the Unit by getting the Unit's current location and offsetting it by the direction we passed in which this case is `q:0, r:1, s: -1`. This will move the Unit North East.

## 8. Moving in other directions

So far we have implemented movement in one direction so to move in the other 5 cardinal directions we can simply repeat what we have done for moving North East:

-   Add functions that call the associated contract function e.g. `moveUnitE`

`UnitController.js`

```js
...
    const moveE = () => {
        const payload = ds.encodeCall("function moveUnitE()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };
...

```

-   Add buttons that call `moveE`, `moveSE`, `moveSW`, `moveW` and `moveNW`

`UnitController.js`

```js
...

    return {
...
                        buttons: [
                            {
                                text: "Spawn Unit",
                                type: "action",
                                action: spawnUnit,
                                disabled: buildingUnit,
                            },
                            {
                                text: "Move Unit ↗️",
                                type: "action",
                                action: moveNE,
                                disabled: !buildingUnit,
                            },
                            {
                                text: "Move Unit ➡️",
                                type: "action",
                                action: moveE,
                                disabled: !buildingUnit,
                            },
...
```

-   Add the function signatures at the top of the contract:

`UnitController.sol`

```solidity
...
contract UnitController is BuildingKind {
    function spawnUnit() external {}
    function moveUnitNE() external {}
    function moveUnitE() external {}
    function moveUnitSE() external {}
    function moveUnitSW() external {}
    function moveUnitW() external {}
    function moveUnitNW() external {}
...
```

-   Decode and call the `_moveUnit` function with a vector that represents 1 of the 6 cardinal directions.

```solidity
...
    function use(Game ds, bytes24 buildingInstance, bytes24, /*actor*/ bytes calldata payload) public override {
        if ((bytes4)(payload) == this.spawnUnit.selector) {
            _spawnUnit(ds, buildingInstance);
        } else if ((bytes4)(payload) == this.moveUnitNE.selector) {
            _moveUnit(ds, [int16(0), int16(1), int16(-1)]);
        } else if ((bytes4)(payload) == this.moveUnitE.selector) {
            _moveUnit(ds, [int16(1), int16(0), int16(-1)]);
        } else if ((bytes4)(payload) == this.moveUnitSE.selector) {
            _moveUnit(ds, [int16(1), int16(-1), int16(0)]);
        } else if ((bytes4)(payload) == this.moveUnitSW.selector) {
            _moveUnit(ds, [int16(0), int16(-1), int16(1)]);
        } else if ((bytes4)(payload) == this.moveUnitW.selector) {
            _moveUnit(ds, [int16(-1), int16(0), int16(1)]);
        } else if ((bytes4)(payload) == this.moveUnitNW.selector) {
            _moveUnit(ds, [int16(-1), int16(1), int16(0)]);
        }
    }
...
```
