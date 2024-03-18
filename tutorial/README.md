# Building Games with Downstream

## Build and run locally
Follow the instructions in the [root README](../README.md)

## Building Fabricator
browse to [localhost:3000/building-fabricator](http://localhost:3000/building-fabricator)

The Building Fabricator allows you to deploy buildings and items to Downstream without having to leave the game!

<img src="images/building-fabricator.png" width="200">

## Tile Fabricator
browse to [localhost:3000/tile-fabricator](http://localhost:3000/tile-fabricator)

The Tile Fabricator allows you to draw and remove tiles and buildings from a map definition and then export that as a configuration yaml file.

![](images/tile-fabricator.png)

## CLI
Available as an npm package, `ds` is how buildings and maps are deployed to Downstream.

Installation: `npm install -g @playmint/ds-cli`

Help: `ds --help`

### Deploying over current map

Use the building-fabricator to export building sources and the tile-fabricator to export map files. Combine them all in a single folder and use `ds` to deploy them to a running Downstream:

```ds apply -n local -k <private key> -R f <exported folder>```

> note that `-k <private key>` can use the player private key if connected to Downstream with a Burner. Or you wil be presented with a WalletConnect QR code if you leave this option out.

### Deploying fresh Downstream with your map

- Stop any local running build.
- Copy your map manifest and building source to [contracts/src/maps](../contracts/src/maps)<map-folder>
- Re-run with `MAP=<map-folder> docker compose up`

## Adding Game Logic

## BuildingKind source overview
The source code exported from the building-fabricator is split into 3 files:


#### BasicFactory.yaml
This contains the parameters set by you in the Building Fabricator and is the entry point when passed to `ds apply`.
        
#### BasicFactory.js - UI and action dispatch
This is the javascript that controls UI behaviour and is deployed to chain as call data and linked to your building contract.

It implements an `update` function, with access to state to make decisions about what to display.

It also acts as a way to dispatch game actions to chain on behalf of the selected ***Unit***, e.g. BUILDING_USE. 

The returns block of `update` configures the building UI for display and hooks up any buttons to functions declared in this file.

The exported BasicFactory.js contains commented out code with examples of how to log the available state and how to restrict which Units can use the building.
        
#### BasicFactory.sol - onchain logic
This defines the building contract deployed to chain and must implement `BuildingKind` interface. The entry point is the `BuildingKind.use` function, which can dispatch actions on behalf the ***Building***, e.g. CRAFT.

The `use` function takes an optional payload param to be used for variable behaviour.

The exported BasicFactory.sol contains commented out code of how to restrict which Units can use the building.

## Examples
> ⚠️ We are working on a tutorial to introduce all of Downstream's creation tools. 
See some feature examples in [contracts/src/example-plugins](../contracts/src/example-plugins) and full maps in [contracts/src/maps](../contracts/src/maps)

