// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {BaseGame} from "cog/Game.sol";
import {Dispatcher} from "cog/Dispatcher.sol";
import {Node, BiomeKind, Schema} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

using Schema for State;

struct Material {
    uint256 quantity;
    bytes24 item;
}

struct Input {
    uint256 quantity;
    bytes24 item;
}

struct Output {
    uint256 quantity;
    bytes24 item;
}

struct BuildingConfig {
    uint256 id;
    string name;
    Material[4] materials;
    Input[4] inputs;
    Output[1] outputs;
    address implementation;
    string plugin;
}

library BuildingUtils {
    function register(BaseGame ds, BuildingConfig memory cfg) internal returns (bytes24) {
        Dispatcher dispatcher = ds.getDispatcher();
        bytes24 buildingKind = Node.BuildingKind(uint64(cfg.id));
        bytes24[4] memory materialItem;
        uint64[4] memory materialQty;
        for (uint8 i = 0; i < cfg.materials.length; i++) {
            materialItem[i] = cfg.materials[i].item;
            materialQty[i] = uint64(cfg.materials[i].quantity);
        }
        dispatcher.dispatch(
            abi.encodeCall(Actions.REGISTER_BUILDING_KIND, (buildingKind, cfg.name, materialItem, materialQty))
        );
        if (address(cfg.implementation) != address(0)) {
            dispatcher.dispatch(
                abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (buildingKind, address(cfg.implementation)))
            );
        }
        if (abi.encodePacked(cfg.plugin).length != 0) {
            dispatcher.dispatch(
                abi.encodeCall(
                    Actions.REGISTER_KIND_PLUGIN,
                    (Node.ClientPlugin(uint64(cfg.id)), buildingKind, cfg.name, cfg.plugin)
                )
            );
        }
        // register building as capable of crafting if an output is given
        if (cfg.outputs[0].item != 0x0) {
            bytes24[4] memory inputItem;
            uint64[4] memory inputQty;
            for (uint8 i = 0; i < cfg.inputs.length; i++) {
                inputItem[i] = cfg.inputs[i].item;
                inputQty[i] = uint64(cfg.inputs[i].quantity);
            }
            bytes24 outputItem = cfg.outputs[0].item;
            uint64 outputQty = uint64(cfg.outputs[0].quantity);
            dispatcher.dispatch(
                abi.encodeCall(
                    Actions.REGISTER_CRAFT_RECIPE, (buildingKind, inputItem, inputQty, outputItem, outputQty)
                )
            );
        }
        return buildingKind;
    }

    // temporary helper to allow constructing a building without any
    // materials to test out some objective ideas.
    // THIS IS A CHEAT AND WILL BE REMOVED
    function construct(BaseGame ds, bytes24 buildingKind, string memory model, int16 q, int16 r, int16 s)
        internal
        returns (bytes24 buildingInstance)
    {
        Dispatcher dispatcher = ds.getDispatcher();
        State state = ds.getState();
        // force discover tile
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (BiomeKind.DISCOVERED, q, r, s)));
        bytes24 targetTile = Node.Tile(0, q, r, s);
        // make instance id
        buildingInstance = Node.Building(0, q, r, s);
        // set type of building
        state.setBuildingKind(buildingInstance, buildingKind);
        // set building owner to sender
        state.setOwner(buildingInstance, Node.Player(msg.sender));
        // set building location
        state.setFixedLocation(buildingInstance, targetTile);
        // attach the inputs/output bags
        bytes24 inputBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance, "input")))));
        bytes24 outputBag = Node.Bag(uint64(uint256(keccak256(abi.encode(buildingInstance, "output")))));
        state.setEquipSlot(buildingInstance, 0, inputBag);
        state.setEquipSlot(buildingInstance, 1, outputBag);
        // annotate the building kind's model
        state.annotate(buildingKind, "model", model);
        // return id
        return buildingInstance;
    }
}
