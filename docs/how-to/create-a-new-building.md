---
sidebar_position: 2
title: Create new Buildings
---

# Developing a New Building

**Windows users will need to enable WSL for this process** (_[https://learn.microsoft.com/en-us/windows/wsl/install](https://learn.microsoft.com/en-us/windows/wsl/install)_)

## Getting Set Up

1. Install [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) if you don't have it.
2. Clone this repository: [https://github.com/playmint/ds-hammer-factory](https://github.com/playmint/ds-hammer-factory) with recursive submodules
    > `git clone --recurse-submodules https://github.com/playmint/ds-hammer-factory.git`
3. This is a forge project. Follow the instructions here to get setup: [install foundry](https://book.getfoundry.sh/getting-started/installation)
    - Mac Users may need to [install "brew" first](https://docs.brew.sh/Installation)
4. Confirm you are set up correctly by navigating to the ds-hammer-factory folder and running `forge test` from the command line
   **Note: Windows users will need to be in WSL for all command-line steps.**

## Creating a Pizzeria

We’re going to quickly create a new building - a Pizzeria.

1. In the /src folder there are two files:
    - HammerFactory.js
    - HammerFactory.sol
2. Duplicate both of these files and rename the new files to:
    - Pizzeria.js
    - Pizzeria.sol

### Important - These need to be new files. Don't overwrite the originals.

### Important 2 - Everything is case-sensitive!

### Pizzeria.sol

The Pizzeria is a lot like the HammerFactory, but instead of crafting Hammers it will cook Pizzas!
Because of the similar functionality we don’t need to change much in this file.

1. Line 9: Rename the contract to Pizzeria

```solidity
contract Pizzeria is BuildingKind {
```

### Pizzeria.js

The Javascript file describes how the building will be represented in the game - the UI interface, and the console logs.

1. Line 46: This is the console log that is printed when the building is used. You can put whatever you want here!

```jsx
ds.log("Extra pepperoni coming up!");
```

1. Line 54 & 55: Put in a relevant ID and title. The title will be displayed ingame

```jsx
id: 'pizzeria',
title: 'Paulo\'s Pizzeria',
```

1. Line 56: This is the description text that displays on the building. You can leave it as is, or make it more personal

```jsx
summary: `For the best pizza put ${want0?.balance}x ${want0?.item?.name?.value} and ${want1?.balance}x ${want1?.item?.name?.value} into our oven`,
```

1. Line 61: This displays the button to “use” the building.

```jsx
buttons: [{ text: 'Cook Pizza', type: 'action', action: craft, disabled: !canCraft }],
```

## Writing a Deployment Script

The deployment script will register the building and item to the game, and link them to your building scripts.

1. Navigate to the /script folder and duplicate \***\*\*\*\*\***Deploy.sol\***\*\*\*\*\***
2. Rename this new file to \***\*\*\*\*\*\*\***Deploy_Pizzeria.sol\***\*\*\*\*\*\*\***

Open up the file and make the following edits:

1. Line 11: Point the import to the _Pizzeria.sol_

```solidity
import {Pizzeria} from "../src/Pizzeria.sol";
```

1. Lines 59 - 65: This is where we generate and deploy the bytes for the building (Pizzeria) and the item (Pizza)

```solidity
// deploy the pizza and pizzeria
bytes24 pizzaItem = registerPizzaItem(ds, extensionID);
bytes24 pizzeria = registerPizzeria(ds, extensionID, pizzaItem);

// dump deployed ids
console2.log("ItemKind", uint256(bytes32(pizzaItem)));
console2.log("BuildingKind", uint256(bytes32(pizzeria)));
```

1. Lines 70 - 83: This is where we define the details of the pizza

```solidity
// register a new item id
    function registerPizzaItem(Game ds, uint64 extensionID) public returns (bytes24 itemKind) {
        return ItemUtils.register(ds, ItemConfig({
            id: extensionID,
            name: "Pizza",
            icon: "02-62",
            greenGoo: 10,       //In combat, Green Goo increases life
            blueGoo: 0,         //In combat, Blue Goo increases defense
            redGoo: 6,          //In combat, Red Goo increases attack
            stackable: false,
            implementation: address(0),
            plugin: ""
        }));
    }
```

**\*\*\*\***\*\*\***\*\*\*\***For more information about these details, see the "Creating New Items" guide.**\*\*\*\***\*\*\***\*\*\*\***

1. Lines 85 - 177: Finally we list the details of the Pizzeria.

```solidity
    function registerPizzeria(Game ds, uint64 extensionID, bytes24 pizza) public returns (bytes24 buildingKind) {

        // find the base item ids we will use as inputs for our Pizzeria
        bytes24 none = 0x0;
        bytes24 GreenGoo = ItemUtils.GreenGoo();
        bytes24 BlueGoo = ItemUtils.BlueGoo();
        bytes24 RedGoo = ItemUtils.RedGoo();

        // register a new building kind
        return BuildingUtils.register(ds, BuildingConfig({
            id: extensionID,
            name: "Paulo\'s Pizzeria",
            materials: [
                Material({quantity: 10, item: GreenGoo}), // these are what it costs to construct the factory
                Material({quantity: 10, item: BlueGoo}),
                Material({quantity: 10, item: RedGoo}),
                Material({quantity: 0, item: none})
            ],
            inputs: [
                Input({quantity: 10, item: GreenGoo}), // these are required inputs to get the output
                Input({quantity: 6, item: RedGoo}),
                Input({quantity: 0, item: none}),
                Input({quantity: 0, item: none})
            ],
            outputs: [
                Output({quantity: 1, item: pizza}) // this is the output that can be crafted given the inputs
            ],
            implementation: address(new Pizzeria()),
            plugin: vm.readFile("src/Pizzeria.js")
        }));
    }
}
```

## Deploying Your Building

Finally, we can call this deploy script and upload the building to the game.

1. Choose a number from 1 to 9223372036854775807
    - **Write down this number. You’ll need it if you want to make changes to your building!**
2. From the command line type:

```
BUILDING_KIND_EXTENSION_ID=InsertYourID GAME_ADDRESS=0x1D8e3A7Dc250633C192AC1bC9D141E1f95C419AB forge script script/Deploy_Pizzeria.sol --broadcast --verify --rpc-url "https://network-ds-test.dev.playmint.com"
```

1. Watch it compile and hope it works!

## Testing Your New Building

To test your new creation you’ll need to place it in the game!

1. Go to the website: [https://frontend-ds-test.dev.playmint.com/](https://frontend-ds-test.dev.playmint.com/)
2. Log on with Metamask
    - Spawn a Unit if you don’t have one already
3. Find enough construction materials
    - 10 x Green Goo
    - 10 x Blue Goo
    - 10 x Red Goo
4. Select the Build functionality and place your new building on an empty tile
5. Move your Unit to a tile that is adjacent to your building
6. Click the building, and click the "USE" button
7. Add the required items to the crafting panel
8. Click the “Cook Pizza” button
