# Example Javascript Functionality

## Checking if the Engineer has a specific item

*********E.g. Only allow building functionality if they have the item*********

```jsx
//Look for an item with by ID
var hasDesiredItem = false

//Loop through both of the Engineer's bags
for (var j = 0; j < selectedEngineer.bags.length; j++) {
	//Loop through all the slots in the bag
	for (var i = 0; i < 4; i++) {
		//If the slot exists...
		if (selectedEngineer.bags[j].bag.slots[i]) {
			//Check for item, check item ID, and check balance
			var slot = selectedEngineer.bags[j].bag.slots[i];
		  if (slot.item && slot.item.id === '0x6a7a67f00005c49200000000000000050000000500000005' && slot.balance >= 1) {
          hasRubberDuck = true;
      }
    }
  }
}
```

- Item IDs can be found on GraphQL (see Item doc)
- Note: If you hide functionality behind having an item, don’t ask for the item to be traded at the building. As soon as it is put into the building’s bags the building will hide its functionality (I learnt this the hard way!)

## Finding the distance from Selected Engineer to the Building

********E.g. Hide building information unless the Engineer is near to the building********

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

const { tiles, seeker } = selected || {};
    const selectedTile = tiles && tiles.length === 1 ? tiles[0] : undefined;
    const selectedBuilding = selectedTile?.building;
    const selectedEngineer = seeker;

    var engineerDistance = 0;
    if (selectedEngineer) {
        engineerDistance = distance(selectedEngineer.nextLocation.tile, selectedTile);
    }
```