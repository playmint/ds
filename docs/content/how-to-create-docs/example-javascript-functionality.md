# Example Javascript Functionality

## Checking if the Unit has a specific item

*********E.g. Only allow building functionality if they have the item*********

```jsx
//Look for an item with by ID
var hasDesiredItem = false

//Loop through both of the Unit's bags
for (var j = 0; j < selectedUnit.bags.length; j++) {
	//Loop through all the slots in the bag
	for (var i = 0; i < 4; i++) {
		//If the slot exists...
		if (selectedUnit.bags[j].bag.slots[i]) {
			//Check for item, check item ID, and check balance
			var slot = selectedUnit.bags[j].bag.slots[i];
		  if (slot.item && slot.item.id === '0x6a7a67f00005c49200000000000000050000000500000005' && slot.balance >= 1) {
          hasRubberDuck = true;
      }
    }
  }
}
```

- Item IDs can be found on GraphQL (see Item doc)
- Note: If you hide functionality behind having an item, don’t ask for the item to be traded at the building. As soon as it is put into the building’s bags the building will hide its functionality (I learnt this the hard way!)

## Finding the distance from Selected Unit to the Building

********E.g. Hide building information unless the Unit is near to the building********

```jsx
//Function to test the distance between two tiles
    function distance(a, b) {
        return (
            (Math.abs(Number(BigInt.asIntN(16, a.coords[1])) - Number(BigInt.asIntN(16, b.coords[1]))) +
                Math.abs(Number(BigInt.asIntN(16, a.coords[2])) - Number(BigInt.asIntN(16, b.coords[2]))) +
                Math.abs(Number(BigInt.asIntN(16, a.coords[3])) - Number(BigInt.asIntN(16, b.coords[3])))) /
            2
        );
    }

const { tiles, mobileUnit } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedUnit = mobileUnit;

    var unitDistance = 0;
    if (selectedUnit) {
        unitDistance = distance(selectedUnit.nextLocation.tile, selectedTile);
    }
```

## Getting an item's constiuent Goo

********E.g. Does the unit have an item with >100 goo********

```jsx
//Loop through all the Unit's bags
    for (var j = 0; j < selectedMobileUnit.bags.length; j++) {

        //Loop through the bag's slots
        for (var i = 0; i < 4; i++) {

            //If the slot exists...
            if (selectedMobileUnit.bags[j].bag.slots[i]) {
                var slot = selectedMobileUnit.bags[j].bag.slots[i];

                //Sometimes a slot will have memory of an old item... but if it does the balance will be 0
                if (slot.item && slot.balance > 0) {

                    var id = slot.item.id;

                    //This bit of code derives the item's details from its ID
                    var [stackable, greenGoo, blueGoo, redGoo] = [...id]
                        .slice(2)
                        .reduce((bs, b, idx) => {
                            if (idx % 8 === 0) {
                                bs.push('0x');
                            }
                            bs[bs.length - 1] += b;
                            return bs;
                        }, [])
                        .map((n) => BigInt(n))
                        .slice(-4);

                    if (!stackable) {
                        totalGreenGoo += parseInt(greenGoo, 10);
                        totalBlueGoo += parseInt(blueGoo, 10);
                        totalRedGoo += parseInt(redGoo, 10);
                    }               
                }
            }
        }
    }
```