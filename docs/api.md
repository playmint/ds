---
sidebar_position: 3
title: API Reference
---

# Downstream API

Downstream is a composable game. Players are able to deploy extensions that
expose new functionality that becomes available to all other players.

Extensions are generally made up of two halves, A Javascript plugin that
exposes some kind of interface within the game's UI (like a button), and some
solidity code, called by that interface that can call into game actions to
change the state of the game.

* [BuildingKind Extensions](/docs/api/buildings) add new types of building to the game
* [Javascript API](/docs/api/javascript) for UI plugins
* [Javascript Examples](/docs/api/javascript-examples) example plugin usage
* [Solidity API](/docs/api/solidity) for smart contract interactions
