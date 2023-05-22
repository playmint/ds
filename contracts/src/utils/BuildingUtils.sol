// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {BaseGame} from "cog/Game.sol";
import {Dispatcher} from "cog/Dispatcher.sol";
import {Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

struct Material {
    uint quantity;
    bytes24 item;
}

struct Input {
    uint quantity;
    bytes24 item;
}

struct Output {
    uint quantity;
    bytes24 item;
}

struct BuildingConfig {
    uint id;
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
        for (uint8 i=0; i<cfg.materials.length; i++) {
            materialItem[i] = cfg.materials[i].item;
            materialQty[i] = uint64(cfg.materials[i].quantity);
        }
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND,
                (buildingKind, cfg.name, materialItem, materialQty)
            )
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
            for (uint8 i=0; i<cfg.inputs.length; i++) {
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
}
