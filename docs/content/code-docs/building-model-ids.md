# Building Model IDs

The types of models that your building can use depend on the **category** of building that you are creating.

This page explains which models are available for which categories and how to use them.

## Factory/Custom Buildings ##
The visuals for `category: factory` or `category: custom` buildings are created using two stacked 'Totems'.

The format for setting these totems in your building's model tag is as follows: `model: ID-ID` where the first 'ID' is the **lower** building in the stack and the second is the **upper** building.

For example, `model: 01-08` would create a building with a Bird Totem on the bottom and a Wooden Hut on the top.

**Here is a list of all available totem IDs for you to choose from:**
- **ID: `00` Barrel** 
    - ![](/images/building-totems/Block_Barrel.png)
- **ID: `01` Bird Totem** 
    - ![](/images/building-totems/Block_BirdTotem.png)
- **ID: `02` Burger** 
    - ![](/images/building-totems/Block_Burger.png)
- **ID: `03` Cactus** 
    - ![](/images/building-totems/Block_Cactus.png)
- **ID: `04` Cistern** 
    - ![](/images/building-totems/Block_Cistern.png)
- **ID: `05` Horned Totem** 
    - ![](/images/building-totems/Block_HornedTotem.png)
- **ID: `06` Stone Turret** 
    - ![](/images/building-totems/Block_StoneTurret.png)
- **ID: `07` Van** 
    - ![](/images/building-totems/Block_Van.png)
- **ID: `08` Wooden Hut** 
    - ![](/images/building-totems/Block_WoodenHut.png)

## Blocker Buildings ##
The visuals for `category: blocker` buildings are chosen using a single named ID.

For example, `model: GrassLarge` would create a blocker with the Large Grass model.

**Here is a list of all available blocker IDs for you to choose from:**
- **ID: `'enemy'`** 
    - ![](/images/building-totems/blockers/Enemy.png)
- **ID: `'CactusLarge'`** 
    - ![](/images/building-totems/blockers/CactusLarge.png)
- **ID: `'CactusSmall'`** 
    - ![](/images/building-totems/blockers/CactusSmall.png)
- **ID: `'GrassLarge'`** 
    - ![](/images/building-totems/blockers/GrassLarge.png)
- **ID: `'LogWall'`** 
    - ![](/images/building-totems/blockers/LogWall.png)
- **ID: `'OakTreesLarge'`** 
    - ![](/images/building-totems/blockers/OakTreesLarge.png)
- **ID: `'OakTreesSmall'`** 
    - ![](/images/building-totems/blockers/OakTreesSmall.png)
- **ID: `'PalmTrees'`** 
    - ![](/images/building-totems/blockers/PalmTrees.png)
- **ID: `'PineTreesLarge'`** 
    - ![](/images/building-totems/blockers/PineTreesLarge.png)
- **ID: `'PineTreesSmall'`** 
    - ![](/images/building-totems/blockers/PineTreesSmall.png)
- **ID: `'rocksLarge'`** 
    - ![](/images/building-totems/blockers/Shrub.png)
- **ID: `'rocksSmall'`** 
    - ![](/images/building-totems/blockers/StoneWall.png)
- **ID: `'Shrub'`** 
    - ![](/images/building-totems/blockers/rocksLarge.png)
- **ID: `'StoneWall'`** 
    - ![](/images/building-totems/blockers/rocksSmall.png)

## Extractor Buildings ##
The visuals for `category: extractor` buildings are chosen using a color ID to decide which color goo should be shown in the extractor's tank.

For example, `model: red` would create an extractor with red colored goo.

**Here is a list of all available extractor IDs for you to choose from:**
- **ID: `red`** 
    - ![](/images/building-totems/extractors/ExtractorRed.png)
- **ID: `green`** 
    - ![](/images/building-totems/extractors/ExtractorGreen.png)
- **ID: `blue`** 
    - ![](/images/building-totems/extractors/ExtractorBlue.png)