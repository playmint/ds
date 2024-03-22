# Tutorial Room 5

This example shows:

-   How to display a number on a `Counter` building
-   How to display a countdown timer on a `Countdown` building
-   How to set data on a building instance which in this case is
    -   The `count` property which displayed on the `Counter` buildings and is incremented via the building UI
    -   The `startBlock` and `endBlock` properties which are used to drive the `Coundown` buildings which are set when the countdown is started

## Displaying a number on a Counter building

The `CounterHQ` building drives the display of the `Counter` buildings by finding all Counter buildings within a 2 tile radius of the HQ and setting the number to be displayed by setting the `map` property on the building's output object

```
    map: counterBuildings.map((b) => ({
        type: "building",
        id: `${b.id}`,
        key: "labelText",
        value: `${count % 100}`,
    })),
```

## Setting data on a building

For the counter buildings we are doing this by calling the `increment()` on the contract associated with the countdown HQ building which will read the current value of `count`, increment it and save it back to the building

`CountdownHQ.js`

```
    const IncrementCounter = () => {
        const payload = ds.encodeCall("function increment()", []);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [counterHQ.id, mobileUnit.id, payload],
        });
    };
```

`CountdownHQ.sol`

```
    uint256 count = uint256(state.getData(buildingInstance, "count"));
    ds.getDispatcher().dispatch(
        abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingInstance, "count", bytes32(count + 1)))
    );
```

# Displaying a countdown on the countdown buildings

For this we are setting a start and end block as data on the `CountdownHQ` building

`CountdownHQ.js`

```
    const startTimer = (durationSecs) => {
        const endBlock = nowBlock + durationSecs / BLOCK_TIME_SECS;

        const payload = ds.encodeCall("function startTimer(uint256)", [
            endBlock,
        ]);

        ds.dispatch({
            name: "BUILDING_USE",
            args: [countdownHQ.id, mobileUnit.id, payload],
        });
    };
```

`CountdownHQ.sol`

```
    function _startTimer(Game ds, bytes24 buildingInstance, uint256 endBlock) internal {
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingInstance, "startBlock", bytes32(block.number)))
        );

        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.SET_DATA_ON_BUILDING, (buildingInstance, "endBlock", bytes32(endBlock)))
        );
    }
```

And with this data we use these block numbers to calculate the elapsed and remaining time which is supplied to the countdown buildings via the map object.
If no data has been set i.e initial state, then manually display '00:30' to prevent the clock from ringing during its initial state

`CountdownHQ.js`

```
    const nowBlock = block;
    const startBlock = getDataInt(countdownHQ, "startBlock");
    const endBlock = getDataInt(countdownHQ, "endBlock");

    const remainingBlocks = Math.max(endBlock - nowBlock, 0);
    const elapsedBlocks = nowBlock - startBlock;
    const remainingTimeMs = remainingBlocks * 2 * 1000;
    const elapsedTimeMS = elapsedBlocks * 2 * 1000;

    const now = Date.now();
    const startTime = now - elapsedTimeMS;
    const endTime = now + remainingTimeMs;

...

    map: countdownBuildings.flatMap((b) => {
        // If the startBlock hasn't been set then we're in the initial state therefore we
        // set the label text so the countdown displays '00:30' without ringing
        return startBlock === 0
            ? [
                    {
                        type: "building",
                        id: `${b.id}`,
                        key: "labelText",
                        value: `00:30`,
                    },
                ]
            : [
                    {
                        type: "building",
                        id: `${b.id}`,
                        key: "countdown-start",
                        value: `${startTime}`,
                    },
                    {
                        type: "building",
                        id: `${b.id}`,
                        key: "countdown-end",
                        value: `${endTime}`,
                    },
                ];
    }),
```
