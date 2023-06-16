# Items

## Atoms

All items in Downstream contain atoms. There are 3 types of atoms:

- Life
- Defence
- Attack

When a new item is registered it can receive upto half of the atoms in its inputs. For example, if its INPUT ingredients contains exactly 10 ATK Atoms and 5 DEFENCE atoms you can set the new item’s stats to be: 5 ATK, 2 DEF, 0 LIFE.
You are able to register the item with lower values than these, but if you try to deploy the script with higher values than the INPUTS can support it will throw an error.

The easiest way to see how many atoms an item has is to hover over it in the inventory. The base resources found in the game contain:

- Kikis = 2 LIFE atoms
- Bouba = 2 DEF atoms
- Semiote = 2 ATK atoms

## Stackable / Equipable

Items are always one of these. Either they are *********stackable********* or they are **********equipable.**********

- Stackable items can be stacked, so that upto 100 fit into 1 inventory slot. However, although they have atoms these are not taken into account when calculating combat stats
- Equipable items can not be staced. Only 1 will fit into 1 slot. These items DO have their atoms taken into account during combat.

As a general rule, stackable items are “resources” whilst equipable items are “gear”. 

## Item IDs

When you set the crafting items you need to reference their IDs. The easiest way to find these is to go to [https://services-ds-main.dev.playmint.com/](https://services-ds-main.dev.playmint.com/) and run this query: 

```jsx
{
  game(id: "DAWNSEEKERS"){    
    state {
      items: nodes(match: {kinds: "Item"}) {
        id
        name: annotation(name: "name") {
          value
        }
      }
    }
  }
}
```

This will show all registered items by ID and name. Note - multiple items can have the same name,

## Icon

You can choose your item’s icon from a large collection. These are displayed here: [https://playmintglobal.z16.web.core.windows.net/icons/sheet.html](https://playmintglobal.z16.web.core.windows.net/icons/sheet.html)

Just put the the “xx-xx” number as the ****icon**** variable.