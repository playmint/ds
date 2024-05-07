# Restrictive items

This example shows how you can lock down an item using an ItemKind contract so that it can only be:

-   Crafted by a building with the same owner as the item
-   Extracted by an extractor with the same owner as the item
-   Rewarded in the zone that has the same owner as the item
-   Spawned into a zone that has the same owner as the item

To see this in action, first deploy this example with one account and then deploy in a second zone owned by another account.

In the first zone you'll see a factory and extractor that can make special items and a bag containing special items. If you destroy the factory you will receive 1 special item and some good as a reward.

In the second zone there will be no bag containing the special items as they can only be spawned in a zone that owns the ItemKind. The extractor will not be able to produce special items as items can only be extracted in the owner's zone. Destroying the factory will only award you with goo but no special items.

To test the restrictions on crafting you'll have to make a building that outputs special items using the building fabricator or use the yaml below:

```
---
kind: BuildingKind
spec:
  category: factory
  name: Fake special item factory
  description: Let's fail to make a special item
  model: 04-10
  color: 4
  contract:
    file: ./BasicFactory.sol
  plugin:
    file: ./BasicFactory.js
  materials:
  - name: Red Goo
    quantity: 10
  - name: Green Goo
    quantity: 10
  - name: Blue Goo
    quantity: 10
  inputs:
  - name: Red Goo
    quantity: 10
  - name: Green Goo
    quantity: 10
  - name: Blue Goo
    quantity: 10
  outputs:
  - name: Special Item
    quantity: 1

```

This building will not be able to craft special items in either zone.
