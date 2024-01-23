---
sidebar_position: 3
title: Create New Items
---

# Creating New Items

## Goo

All items in Downstream contain goo. There are 3 types of goo:

-   Green Goo
-   Blue Goo
-   Red Goo

When a new item is registered you state its Goo composition. However, these numbers can only be at most half the value of the goo in its input items.
For example, if its INPUT ingredients contain a total of 10 RED goo and 5 BLUE goo the maximum goo the new item can have is: 5 RED, 2 BLUE, 0 GREEN.
You are able to register the item with lower values than these, but if you try to deploy the script with higher values than the INPUTS can support it will throw an error.

The easiest way to see how much goo an item has is to hover over it in the inventory. The base resources found in the game contain:

-   Green Goo = 1 GREEN goo
-   Blue Goo = 1 BLUE goo
-   Red Goo = 1 RED goo

Creators can choose to use goo however they wish. Downstream uses the goo values in combat where:

-   Green Goo = Life
-   Blue Goo = Defense
-   Red Goo = Attack

## Stackable / Equipable

Items are always one of these. Either they are \***\*\*\*\***stackable\***\*\*\*\*** or they are \***\*\*\*\*\***equipable.\***\*\*\*\*\***

-   Stackable items can be stacked, so that up to 100 fit into 1 inventory slot. However, although they have goo, the goo amounts are not taken into account when calculating combat stats
-   Equipable items can not be stacked. Only 1 will fit into 1 slot. These items DO have their goo amounts taken into account during combat. (see [Combat stats](/docs/how-to/play-the-game#combat-stats))

As a general rule, stackable items are “resources” whilst equipable items are “gear”.

## Item IDs

When you set the crafting items you need to reference their IDs. The easiest way to find these is use the `ds` CLI tool with `get items` command. 
