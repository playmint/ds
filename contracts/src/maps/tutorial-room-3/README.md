# Downstream Game Creation Tutorial 3

## Aim

We will follow the steps below to create a series of quests which you will use to guide the player to complete various tasks.

## 1. Preparation
- Before starting, ensure that you have deployed an instance of Downstream locally using Docker. You can find instructions on how to do that in [Tutorial 1 here](../tutorial-room-1/README.md).
- You should also copy the CastleOfTreasure .yaml, .sol and .js files out of the tutorial room 3 folder and paste them into your working folder. To save you some time drawing a map, you can also copy the Tile.yaml.


## 2. Create a new Quest

We will begin by creating our first quest, which will ask the player to move to a certain location. Create a new file called “00_MoveToLocation.yaml” and open it in your IDE.
Begin by adding the following lines to define that the code in this file will be representing a Quest:

```yaml
---
kind: Quest
```

Next you should add information about the Quest itself:

```yaml
spec:
    name: Move to the South-East Island
    description: "Click 'Move', then click on a tile. Then click 'Confirm' to move your Unit to that location."
```

You can then define what tasks the player must do to complete this quest. For this first quest, we want the player to move to a location, so we’ll add a “coord” type task:

```yaml
    tasks:
    - kind: coord
        name: Move your unit so that you are standing in the middle of the South-East island
        location: [8, -8, 0]
```

We want a new quest to be assigned when the player completes this quest, so you will need to add the name of the quest to the `next` list:

```yaml
 next: ["Construct a Castle of Treasure"]
```

With that added, your code should look like this. Be careful that you have the correct indentation.

```yaml
---
kind: Quest
spec:
 name: Move to the South-East Island
 description: "Click 'Move', then click on a tile. Then click 'Confirm' to move your Unit to that location."
 tasks:
   - kind: coord
     name: Move your unit so that you are standing in the middle of the South-East island
     location: [8, -8, 0]
 next: ["Construct a Castle of Treasure"]
```

## 3. Create different kinds of Quests

Now that we have our first quest defined, we’ll add in two more for the player to complete.

We’ll start with a quest to construct a building. Create a new file called “01_ConstructCastleOfTreasure.yaml” and paste the following code into it:

```yaml
---
kind: Quest
spec:
 name: Construct a Castle of Treasure
 description: "Click 'Build', then click on a tile. Then select 'Castle of Treasure' from the list of buildings and click 'Confirm'"
 tasks:
   - kind: construct
     name: Construct a Castle of Treasure.
     buildingKind: Castle of Treasure
 next: ["Create Some Treasure"]
```

Note that in this quest we are using a “construct” task type instead of a “coord” task type as we did in the previous example, and we reference what building we want the player to build by name.
It’s important that the name of this quest matches the name we provided to the “next” property in the previous quest’s code.

With that quest ready, we’ll add one more which will require the player to create an item and place it into their inventory.
As before, we will create a new file this time named “02_CreateSomeTreasure.yaml”, and paste the following code into it:

```yaml
---
kind: Quest
spec:
 name: Create Some Treasure
 description: "Use the Castle of Treasure to craft some Treasure."
 tasks:
   - kind: inventory
     name: "Put some Treasure in your bag"
     item:
       name: Treasure
       quantity: 1
```

Again, we have a new task type in this code, this time it’s an “inventory” kind, which has a reference to the name of the item we want the player to put into their inventory as well as the desired quantity.

## 4. Begin a Quest automatically

We now have all of our quests ready to go, but currently nothing will happen because they haven’t been auto-assigned to our player.

For that you’ll need to create a new file called “auto-quest.yaml” and add the following code to declare a starting quest which will be assigned to the player when they enter the game.

```yaml
---
kind: AutoQuest
spec:
 name: 'Move to the South-East Island'
 index: 0
```

## 5. Deploy your new Quests

We will use the Downstream CLI to deploy our newly created building to our local Downstream instance.

Run the following in a terminal in the folder with your exported building source (refer to tutorial 1 for more information).

```
ds apply -n local -z 1 -k <private-key> -R -f ./
```

You should see an output like this:

<img src="./readme-images/deployOutput.png" width=300>

<br/>
After that, you should see your first quest in the UI in your local instance of downstream. After completing each quest you should then see the next until you have completed them all.

<img src="./readme-images/questUI.png" width=300>

## Task Kinds


| Task Kind ID | Additional Parameters | Description |
|---|---|---|
| coord | Location (3 int array) | Instructs the player to move their unit to a specific tile coordinate on the map. The coordinate is defined by the additional parameter ‘location’. The task will be marked as completed when the player is within 1 tile of the location. |
|inventory|item <ul><li>name(string)</li><li>quantity (int)</li></ul>|Instructs the player to add the specified item to their inventory. It requires the additional parameter ‘item:’ and two sub-parameters:<br/>‘name:’ which item<br/>‘quantity:’ how many items to add|
|construct|buildingKind (string)|Instructs the player to construct a specific building on the map. The additional parameter ‘buildingKind:’ states which Building Kind that the player needs to construct.|
|combat|combatState (winAttack/winDefence)|Requires the player to fight another entity on the map. It has an additional parameter called ‘combatState:’ which can be either “winAttack” or “winDefence”.<br/>“winAttack” will complete the quest if the player wins the combat while being part of the attacking force, and “winDefense” will complete the quest if the player wins while being part of the defending force.|
|deployBuilding|craftInput (string)|Instructs the player to deploy a new building kind to the game. The deployed building factory must have an input item specified by the additional parameter ‘craftInput:’.|
|unitStats|life (int)<br/>attack (int)</br>defence (int)|Completed when the unit’s stats reach or exceed a certain threshold defined by the optional parameters ‘life:’, ‘attack:’, and ‘defence:’.|
|questComplete|quest (string)|Used to track whether another quest has been completed. The quest it checks for is specified by the additional parameter ‘quest:’.|
|message|message (string)<br/>buildingKind (string)|Allows you to complete a quest from a buildingKind’s javascript plugin code. It requires two additional parameters:<br/>‘message:’ a string that matches the string sent by ds.sendQuestMessage(string)</br>‘buildingKind:’ States which buildingKind’s js plugin will be sending the message.|

