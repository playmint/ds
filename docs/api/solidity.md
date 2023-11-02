---
title: Solidity Reference
sidebar_position: 10
---

# Solidity Contract Reference

> ℹ️ These code docs reference the Downstream API as viewed from a forge project with playmint/ds installed as a dependecy, like the ds-hammer-factory repository. You could also work with the ds repository directly.

Found in `contracts/libs/ds/src`, this folder is mapped to import as “@ds” and contact code files in these docs are referenced relative to @ds.

## BuildingKind.Use()

```solidity
function use(Game ds, bytes24 buildingInstanceID, bytes24 mobileUnitID, bytes memory payload)
```

This is the entry point for a buildings smart contract.

It is called from the core game when processing a `USE_BUILDING` Action, which is dispatched from the javascript plugin code for a building.

The `ds` param can be used to interact with Downstream via the Action Dispatch system using the current Downstream session key. 

<aside>
ℹ️ You can also compose with any other solidity code on the same Downstream chain but any transactions outside of Downstream will need the player to sign.

</aside>

If the BuildingKind has been registered with a crafting recipe, the `CRAFT` Action can be dispatched.

`buildingInstanceID` and `mobileUnitID` can be used to access the properties on the building being used and the mobileUnit using it. For example accessing their location or any bags they are holding.

## Building Registration

`@ds/Utils/BuildingUtils.register` is a helper function that handles registering a BuildingKind and all its components. Internally it uses the following actions.

A `BuildingKind` Node needs to be registered with Downstream using the `REGISTER_BUILDING_KIND` Action.

Once registered the following actions can be used to set it up:

- `REGISTER_KIND_IMPLEMENTATION` (Solidity smart contract implementation)
- `REGISTER_KIND_PLUGIN` (The Javascript interface)
- `REGISTER_CRAFT_RECIPE` (Optional Crafting Recipe)

### Schema - Nodes and Relationships

Downstream uses COG and its graph data model with all state being represented as Nodes and Relationships.

**`@ds/schema/schema.sol`** defines all the “kinds” of nodes and types (”rel”) of relationship.

Each node is a 24 byte identifier constructed from its kind plus any parameters packed in.

Each relationship is constructed of two nodes of specific kinds and an optional weight value.

Reading the Schema helps understand the structure of the game data but It’s not necessary to understand the internals of Nodes and Relationships. Instead, modifying state is through Actions and reading state is through provided Utility functions.

<aside>
⚠️ Modifying state is currently unprotected. Any smart contract, including new Building contracts could set any state they want. We ask you not to do this and only modify State through Actions - which will be enforced in a future version.

</aside>

## Action Dispatching

Actions are the API to change Downstream state, or put another way, they are used to play the game. Your new Building code can use any Action to change the state of world, as long the action conditions are met.

They are special function signatures including an identifier and set of parameters that can be dispatched via `Game.getDispatcher().dispatch()` and result in an on-chain transaction.

`**@ds/actions/Actions.sol**` defines all the available actions.

The various `Reduce` functions in the `Rule` contracts in **`@ds/rules`** implement the Actions and are where you can see all the restrictions implemented through require calls.

When calling dispatch() the action must be abi encoded with the function signature and relevant parameter values. See examples in @ds/script/deploy.sol for how these are constructed. The intention is to abstract all the common actions away in utility functions like `BuildingUtils.register()` in `**@ds/utils/BuildingUtils.sol**`.

## Downstream Data Model

The data model is written to be as flexible as possible. For example, any node can have the Implementation relationship with a smart contract address. This is used for a common purpose, e.g. BuildingKinds being assigned a solidity implementation by a Mod, but could be used to associate smart contracts with any node.

This list describes, at a slightly higher level than the graph, what the core Downstream data models are. 

- **A** **`Building`** (constructed by players on the map)
    - Has a `Location`
    - Has a `BuildingKind`.
    - Can have multiple `Bags` in `EquipSlots` .
- **A** **`BuildingKind`** (programmed and deployed by modders/builders)
    - Can have a crafting recipe (see `REGISTER_CRAFT_RECIPE`)
        - Including up to `Input` Item-quantities and 1 `Output` item-quantity.
    - Can have a smart contract `implementation`.
    - Can have a javascript plugin implementation (`annotation`)
- **An** **`Item`** (Found in Bags on the map or crafted by Buildings)
    - Has a quantity of each of the 3 `Atom` types.
        - The 3 default Items found in Bags on the map are `Bouba`, `Kiki` and `Semiote` and they all consist of just one Atom type.
    - Is either `stackable` or not (and therefore equipable).
    - Has a name.
    - Has an icon ID.
- **An** **`Atom`** (what make up items)
    - Can be `Defense`, `Attack` or `Life`
- **A** **`Bag`** (Engineers start with two, more appear on the map and magically, tiles and buildings create invisible ones when transferred items)
    - Has 4 Item Slots
    - Each slot can have one equip-able Item or up to 100 stackable Items.
- **An Engineer**  (**`MobileUnit`**  in code) (one spawned for each wallet)
    - Has a location.
    - Has two `Bag` slots.

