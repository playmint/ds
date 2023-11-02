---
sidebar_position: 1
title: Play the Game
---

# Aim of the Game

Although access to this early version of *****Downstream***** is primarily to see what creators can (or can’t) do with our game, we have created a simple quest to get the party started

## *The Great Cleanup* Building

Just north of the spawn point is a building that requires two items. It will reward a medal to whomever can bring it those items.

![The Great Cleanup Building](/images/the-great-cleanup.png)


## Starting the Quest

There are some other buildings near the spawn point. We suggest you craft the items you can get here. Not only are they required for a later part of the quest, but will improve your stats enough to start defeating the easiest enemies.

## Go Explore!

Go visit the buildings on the map, fight enemies and construct your own buildings. By exploring the world, crafting items, and winning at combat you should be able to construct the items needed to “win” the game.

*****Note: You can rename your Unit by double-clicking your name at the top-right. You will need to move your Unit before your will see your new name*****

![Entering a name](/images/enter-name.png)

# Game Controls

## Getting Into the Game

1. Click the “Connect” button at the top-left of the screen
2. Login to Metamask
3. Click the “Spawn Unit” button
4. Click the “Sign" button when prompted
5. You unit will appear in the middle of the map - they will have a red shield above their head

![Spawning In](/images/spawn-in.png)

## Selecting and Deselecting Your Unit

When your Unit is selected, you can interact with the tiles adjacent to it.

- To select your Unit, hover your cursor over that it so that it’s highlighted, and left-click
- The unit’s details and action bar will appear in the UI.

When you deselect your unit you can view the details of tiles anywhere on the map

- To deselect your unit, click on any tile that is not adjacent to it.

![Selecting Yout Unit](/images/selected-unit.png)

## Moving Your Unit

With your Unit selected, you can give it a destination to travel to. This is done by clicking a route of one or more tiles from its current position.

1. Select the “Move” action. This will highlight all the tiles the Unit can move to
2. Left-click one off these tiles
3. You can either press the “Confirm Move” button to move to this tile, or queue up additional moves by continuing to click on the highlighted tiles

![Moving](/images/move-unit.png)

## Scouting

When your unit is next to an unexplored tile it will have the ability to scout it. This will generate it on the blockchain and add it to the world.

1. With your unit selected, click the “Scout” button
2. Click on all adjacent tiles that you want to scout
3. Click the “Confirm Scout” button

![Scouting](/images/scout.png)

## Constructing a Building

Your Unit can construct a building on any empty adjacent tiles

1. With the Unit selected, click the “Build” button
2. Click on one of the highlighted tiles
3. Select the building you want to construct from the drop-down menu. 
    - This contains all buildings that have been deployed to the game, by all creators.
4. Drag-and-drop all required resources from your Unit’s bags, to the building panel.
    - These costs are set by the creator of the building’s contract
    - Multiple players can contribute their resources to this cost
6. When all resources have been added, click the “Confirm Construction” button.

![Constructing a Building](/images/constructing-a-building.png)

## Using a Building

If a building has functionality (e.g. crafting an item) your Unit will need to be adjacent to perform it

1. With your unit selected, click the “Use” button
2. Click on the adjacent building
3. The building’s UI panel will show it’s functionality

## Moving Items to-and-from Bags

You unit is able to interact with any bags on the tile it is on, and any adjacent tiles.

1. With your unit selected, click the tile with the bag
2. The bags contents will be displayed.
3. You can drag-and-drop items between your bags and the tile’s bag

![Moving Items Between Bags](/images/moving-between-bags.png)

## Starting a Combat Session

Any buildings and monsters (which are technically buildings!) can be attacked.

1. With your unit on an adjacent tile, click the “Attack” button
2. Potential targets are highlighted. Click on the one you want to attack.
3. Click the “Start Combat” button button
4. The combat info window will appear, this shows the strength of the attackers and defenders.
5. Click “Start Combat” if you want to being the attack, or close the window if you want to chicken out

![Combat Screen](/images/combat-screen.png)

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
