---
sidebar_position: 2
title: Create new Buildings
---
# Creating in Downstream

Downstream is a composible game extended by the players. Everything in the game is designed to allow anyone to program new types of things with newly invented behavours.

Each extension can comprise of onchain logic through solidity files and a frontend user interface through javascript.

Once deployed to the Downstream chain, these extensions are automatically loaded for everyone to use.

Currently the parts of the game that can be extended are

- Buildings
- Items
- Quests

This document covers buildings that craft new items

# Tools

## The Building Fabricator

The Building Fabricator allows you to deploy buildings and items to Downstream without having to leave the game!

![](images/docs/building-fabrictor.png)

Currently accessible via the Vault of Knowldge Building:

![](images/docs/vault-of-knowledge.png)  

## CLI

Available as an npm package, this tool allows you to deploy extensions with your own code.

in order to use the CLI you will need a [**WalletConnect**](https://walletconnect.com/explorer) and [**npm**](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) installed.

Installation: `npm install -g @playmint/ds-cli`

help `ds --help`

# Combine Fabricator with CLI

Use the BuildingFabrictor to export your first set of files, edit the code and then deploy with the `ds` CLI tool.
        
## BasicFactory.yaml
This contains the parameters set by you in the Building Fabricator and is the entry point to running `ds apply`.
![](images/docs/basic-factory-yaml.png)
        
## BasicFatcory.js
This is the javascript that controls UI behaviour and is deployed to chain as call data and attached linked to your building contract. It implementes an `update` function, with access to state to make decisions and Action Dispatch to make onchain actions on behalf of ***Units***, e.g. BUILDING_USE. The returns block of `update` configures the buidling UI for display and hooks up any buttons to functions declared in this file.
![](images/docs/basic-factory-js.png)

The exported BasicFatcory.js contains commented out code with examples of how to log the available state and how to restrict which Units can use the building.
        
## BasicFactory.sol
This defines the building contract deployed to chain and must implement `BuildingKind` interface. The entry point is the `BuildingKind.use` Function, which can dispatch actions on behalf the ***Building***, e.g. CRAFT. the `use` function takes an optional payload param to be used for variable behaviour.
![](images/docs/basic-factory-sol.png)

The exported BasicFatcory.sol contains commented out code of how to restrict which Units can use the building.
        
## Examples beyond craft buildings
See more buildings at [https://github.com/playmint/ds/tree/main/contracts/src/example-plugins](https://github.com/playmint/ds/tree/main/contracts/src/example-plugins)

# Workshop 
A step by step guide used to accompany an in person workshop might be useful:
[*http://playmint.com/build-your-own-house*](https://www.notion.so/Build-Your-Own-House-ac9391ce8de94b498d09095d7732b7c4?pvs=21)

    

