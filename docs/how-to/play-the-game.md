---
sidebar_position: 1
title: Play the Game
---


## Starting the Game

Greetings new user! All new users are requested to visit the Control Tower when they arrive in the world. A handy quest at the top-left of the screen will remind you of this fact.

*****Note: You can rename your Unit by double-clicking your name at the bottom-left. You will need to move your Unit before your will see your new name*****

## Q.U.E.S.T.S.

The quests at the top-left will guide you through the first 30-minutes of play. Each quest consists of a number of tasks. When a task is completed it will get a tick. When all tasks are completed you can press the button to "Complete" the quest.

*****Note: Tasks that are complete can become uncompleted if you no longer meet the requirements*****

# Game Controls

## Getting Into the Game

1. Click the “Connect” button at the top-left of the screen
2. Choose "Metamask" or "Wallet Connect" to login with your own wallet. Burner will give you a temporary wallet which won't persist between sessions.
3. Click the “Spawn Unit” button
4. Click the “Sign" button when prompted
5. You unit will appear in the middle of the map - they will have an orange icon above their head

## Selecting Your Unit

When the game loads you'll need to select you unit. Simply click the "Select Unit" button in the bottom-left.
When your Unit is selected, you can interact with the tiles adjacent to it.

## Moving Your Unit

Your unit can move to any tile on the map, and will travel via the shortest path.

1. Select the “Move” action at the bottom
2. Left-click on any tile
3. Press the “Confirm Move” button to start moving to this tile

## Constructing a Building

Your Unit can construct a building on any empty tile. Your Unit will move next to the tile if necessary.

1. With the Unit selected, click the “Build” button
2. Click on any empty tile
3. Select the building you want to construct from the drop-down menu. 
    - This contains all buildings that have been deployed to the game, which you can afford to construct.
    - You can choose to also see buildings that you can't afford
6. If you can afford the building, click the “Confirm Construction” button to construct it on the tile.


## Using a Building

Clicking on any building will show you its details. If a building has functionality (e.g. crafting an item) your Unit will need to be moved adjacent to the building to perform it.

## Moving Items to-and-from Bags

You unit is able to interact with any bags on the tile it is on, and any adjacent tiles.

1. With your unit selected, click the tile with the bag
2. The bags contents will be displayed.
3. You can drag-and-drop items between your bags and the tile’s bag

## Starting a Combat Session

Any buildings and bugs (which are technically buildings!) can be attacked.

1. Click the “Attack” button
2. Click on the building you want to attack.
3. Your unit will move next to the building and enter combat
4. Clicking on the tile will show you the overview of the combat. You can get more info by clicking "View Combat"
5. When combat is over, press the "End Combat" button to collect any rewards

## Joining a Combat Session

If two tiles are in combat, they will be highlighted red on the map. Clicking on one of these tiles will show the state of the battle.

Moving your unit onto either of these tiles will make it join the session, on the side of the tile it is standing on.

# Combat

When a Unit attacks a Building it begins a combat session. This will continue until one side has 0 life remaining. 

## Combat Stats

### **********Units**********

- Each Unit begins with 500 life, 30 attack and 23 defence.
- The number of goo they have in equipable items will increase these values
    - Equipable items are non-stackable (i.e. you can only have one per slot)
    - 1x Green Goo = +10 Life
    - 1x Blue Goo = +1 Defense
    - 1x Red Goo = +1 Attack

### Buildings

- The construction costs of a Building will dictate its stats. The goo structure of the building materials will define its life/defense/attack.
- When a Building is deployed it will require a minimum number of each color goo. This is so it can’t be destroyed by an aggressive fly.

## Combat Session Flow

- The combat will session will “tick” every few blocks
- Each tick, the combatants on each side will attack a random participant on the other side
- Damage is worked out with the calculation:

```
Defender's Life -= 1 + (All Attacker's ATK - Defender's DEF)
```

- When a combatant has lost all of their life they are no longer affect the session
    - They do not do any damage
    - They are not chosen as a target to attack

## Leaving Combat

If a participant moves off the combat tile, they are removed from the battle (their life is treated as 0). If they return before the end of combat, their life is restored to its value before they left.

Note: A transaction needs to be sent to "End" the combat session. We're working on tidying this up and improving the UX, but at the moment a user will need to view the combat session and click the "End Combat" button

## Rewards and Penalties

### **********Units**********

- In this version of the game, there is no penalty for a Unit losing in combat.
- Each combat session is treated independently, and any life will be restored for a new session

### Buildings

- If a building is on the losing side of a combat session, the building is destroyed
    - Map enemies are technically buildings!
- The construction costs of the building are shared amongst all winners, based on the percentage damage they contributed
    - For example, if a building cost 100 gold coins to construct and you did 60% of the damage in battle, you will receive 60 gold coins.
