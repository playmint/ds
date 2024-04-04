<img src="images/header.png">

# A guide to building your own game with Downstream

## Welcome to the learning zone!

This page is your one stop shop for learning how to build on top of Downstream. We recommend that you follow the Tutorials to get up and running. The tutorials will explain how to set up your work space and then run you through small example Islands that focus on a small set of mechanics. 

Once you feel you are up to speed on what is currently possible on Downstream, you can check out our Existing Maps and Games!

The Existing Maps are various things that Playmind has created in Downstream. There are some smaller examples like the Gate Demo and some larger examples like the quest-map.
The Existing Games are full games that have been developed by external developers and one by Playmint! They will give you an insight into how far Downstream has already been pushed!

For more in depth information, check out the References page!


## Tutorials
|Tutorial|Preview|Features|
|:-------|:-----:|:-------|
|__[1. My First Map](../contracts/src/maps/tutorial-room-1/)__|<a href="https://drive.google.com/file/d/1rvXt3Fs4M0-yn83Mc0iAG9HlhIJpSDRl/view?usp=drive_link"><img src="images/tutRoom1.png" width="200"></a>|Workspace Set up, Wallets, Units, Tile Fabricator, Building Fabricator, Decorations, CLI, Important files|
|__[2. Enemies in inaccessible places](../contracts/src/maps/tutorial-room-2/)__|<img src="images/tutRoom2.png" width="200">|Doors, Bags, Enemies, Movement, Blockers, Combat|
|__[3. Questing](../contracts/src/maps/tutorial-room-3/)__|<img src="images/tutRoom3.png" width="200">|Quests system, coordinates
|__[4. Disco Room](../contracts/src/maps/tutorial-room-4/)__|<img src="images/tutRoom4.png" width="200">|Tile Colors, Unit Costumes, Billboards, Custom UI|
|__[5. Measuring Success](../contracts/src/maps/tutorial-room-5/)__|<img src="images/tutRoom5.png" width="200">|Counters, Timers, Display Buildings, Custom Onchain State
|__[6. Unit Control Room](../contracts/src/maps/tutorial-room-6/)__|<img src="images/tutRoom6.png" width="200">|Controlling Unit Actions via Buildings

 ## Complete maps
__[All example maps can be found here](../contracts/src/maps)__ 

| Folder      | Tile Fabricator View                           | Description       |
|:------------|:----------------------------------------------:|:------------------|
| default     |<img src="images/map-default.png" width="200">  | A single tile map. Deploy this andhen use ds-cli to apply any other map |
| example-gate|<img src="images/map-gate.png" width="200">     | A map containing a Door and key demo |
| quest-map   |<img src="images/map-quests.png" width="200">   | Showcase of Downstream core systems. Uses the quest system to guide players from task to task|
| team-vanilla|<img src="images/map-vanilla.png" width="200">  | Handy multiple size and shape arenas. Good for setting up and playing multiple session based games |
| tiny        |<img src="images/map-tiny.png" width="200">     | A small empty map. Good for iterating on building development. |
| croissant   |<img src="images/map-croissant.png" width="200">| A Multi Game Map. This showcases multiple games on one map including Tonk Attack; Hexcraft; The Labyrinth and Ducks v Burgers. Tonk attack requires it's own services to be run, see below for details |


## Existing games
__[All example games can be found here](../contracts/src/maps)__ 

| Folder      | Tile Fabricator View                           | Description       |
|:------------|:----------------------------------------------:|:------------------|
| tonk        |<img src="images/map-tonk.png" width="200">     | Game by [Tonk](https://github.com/tonk-gg/ds-extensions-debuggus). Uses: Connection to external server; extensive UI take over; item UI plugin; Unit model swaps |
| hexcraft    |<img src="images/map-hexcraft.png" width="200"> | Game from [1kx](https://github.com/1kx-network/hexcraft). Uses: Team allocation; Building contract code linked; Restricted crafting; Restricted building; Unit model swaps |
| labyrinth   |<img src="images/map-labyrinth.png" width="200">| Game from [RockawayX](https://github.com/rockawayx-labs/ds-dx). Uses: Doors; Password hashing; Combat Stats; Item checking; Quests; Map reset|
| duck-burger |<img src="images/map-tonk.png" width="200">     | Game by [Playmint](https://www.playmint.com). Learn how to make DVB using [Tutorial 5](../contracts/src/maps/tutorial-room-5/)|

### Please note:
Tonk attack requires Tonk services to be running: Run with docker using the `tonk` profile: `docker compose --profile tonk up`


# References
__[For more information, check the reference page](/REFERENCE.md)__
