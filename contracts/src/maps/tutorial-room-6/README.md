# Tutorial Room 6

This example shows:

-   The ability to spawn and control a mobile unit from a building

## Spawning a Mobile Unit from a building

The building plugin isn't doing anything other than calling the `spawnUnit` function on the building contract

`UnitController.js`

```
    const spawnUnit = () => {
        const payload = ds.encodeCall("function spawnUnit()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [selectedBuilding.id, mobileUnit.id, payload],
        });
    };
```

The real work happens in the contract where we

-   generate a 'random' uint32 mobile unit ID by hashing the block number along with the actor (the mobile unit that interacted with the building)
    -   We use the actor ID so more than one person can spawn a unit from the building within the same block
-   dispatch the `SPAWN_MOBILE_UNIT` action which spawns a unit the same way as a new player would via the frontend
-   move the unit to the east of the building by getting the building's location and offsetting it

`UnitController.sol`

```
    function _spawnUnit(Game ds, bytes24 buildingInstance, bytes24 actor) internal {
        bytes24 mobileUnit = Node.MobileUnit(uint32(uint256(keccak256(abi.encodePacked(block.number, actor)))));
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (mobileUnit)));

        // Move mobile unit next to the building
        (int16 q, int16 r, int16 s) = _getTileCoords(ds.getState().getFixedLocation(buildingInstance));
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (uint32(uint192(mobileUnit)), q + 1, r, s - 1))
        );
    }
```

## Controlling a mobile unit from a building

We filter the mobile units to the ones that are owned by the building kind implementation contract. This means if there were more than one instance of the `UnitController` building, it would control all units spawned by any other `UnitController` building including itself due to the units being owned by the building implementation contract rather than the building instance.

`UnitController.js`

```
    // We slice the first 10 characters from the ids to remove the 0x and Node prefix so we are left with the address part of the id
    const buildingUnits = mobileUnits.filter(
        (unit) =>
            unit.owner.id.slice(10) ===
            selectedBuilding.kind.implementation.id.slice(10),
    );

    ...

    const moveNE = () => {
        buildingUnits.forEach((unit) => {
            const payload = ds.encodeCall(
                "function moveUnitNE(bytes24 mobileUnit)",
                [unit.id],
            );

            ds.dispatch({
                name: "BUILDING_USE",
                args: [selectedBuilding.id, mobileUnit.id, payload],
            });
        });
    };
```

In the example there is a separate function for each of the 6 cardinal directions the Mobile Unit can move in. Fewer functions could be declared if we passed in an offset or a direction to a function that did the movement.

The contract simply dispatches the `MOVE_MOBILE_UNIT` action with an offset that matches the cardinal direction

`UnitController.sol`

```
    // First the payload is decoded in the use function to get the unit ID and then the movement function is called

    function use(Game ds, bytes24 buildingInstance, bytes24 actor, bytes calldata payload) public override {
        ...

        if ((bytes4)(payload) == this.moveUnitNE.selector) {
            (bytes24 mobileUnit) = abi.decode(payload[4:], (bytes24));
            _moveUnitNE(ds, mobileUnit);
        }

        ...
    }

    function _moveUnitNE(Game ds, bytes24 mobileUnit) internal {
        (int16 q, int16 r, int16 s) = _getUnitCoords(ds, mobileUnit);
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (uint32(uint192(mobileUnit)), q, r + 1, s - 1))
        );
    }
```
