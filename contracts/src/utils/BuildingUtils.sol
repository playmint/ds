// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import "cog/IGame.sol";
import "cog/IDispatcher.sol";

// TODO: BuildingCategory to be imported from Actions.sol
import {Node, Schema, BuildingCategory} from "@ds/schema/Schema.sol";
import {Actions, BiomeKind} from "@ds/actions/Actions.sol";

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
    bytes24 buildingKind;
    string name;
    BuildingCategory category;
    string model;
    Material[4] materials;
    Input[4] inputs;
    Output[1] outputs;
    address implementation;
    string plugin;
    bool alwaysActivePlugin;
}

library BuildingUtils {
    function register(Game ds, BuildingConfig memory cfg) internal returns (bytes24) {
        Dispatcher dispatcher = ds.getDispatcher();

        // Building material
        bytes24[4] memory materialItemIDs;
        uint64[4] memory materialItemQtys;
        for (uint8 i = 0; i < cfg.materials.length; i++) {
            materialItemIDs[i] = cfg.materials[i].item;
            materialItemQtys[i] = uint64(cfg.materials[i].quantity);
        }

        // Input items
        bytes24[4] memory inputItemIDs;
        uint64[4] memory inputItemQtys;
        for (uint8 i = 0; i < cfg.inputs.length; i++) {
            inputItemIDs[i] = cfg.inputs[i].item;
            inputItemQtys[i] = uint64(cfg.inputs[i].quantity);
        }

        // Output items
        bytes24[1] memory outputItemIDs = [cfg.outputs[0].item];
        uint64[1] memory outputItemQtys = [uint64(cfg.outputs[0].quantity)];

        dispatcher.dispatch(
            abi.encodeCall(
                Actions.REGISTER_BUILDING_KIND,
                (
                    cfg.buildingKind,
                    cfg.name,
                    cfg.category,
                    cfg.model,
                    materialItemIDs,
                    materialItemQtys,
                    inputItemIDs,
                    inputItemQtys,
                    outputItemIDs,
                    outputItemQtys
                )
            )
        );

        // Implementation
        if (address(cfg.implementation) != address(0)) {
            dispatcher.dispatch(
                abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (cfg.buildingKind, address(cfg.implementation)))
            );
        }

        // Plugin
        (uint64 id, /*BuildingCategory category*/ ) = getBuildingKindInfo(cfg.buildingKind);
        if (abi.encodePacked(cfg.plugin).length != 0) {
            dispatcher.dispatch(
                abi.encodeCall(
                    Actions.REGISTER_KIND_PLUGIN,
                    (Node.ClientPlugin(id), cfg.buildingKind, cfg.name, cfg.plugin, cfg.alwaysActivePlugin)
                )
            );
        }

        return cfg.buildingKind;
    }

    function getBuildingKindInfo(bytes24 buildingKind) internal pure returns (uint64 id, BuildingCategory category) {
        id = uint64(uint192(buildingKind) >> 64 & type(uint64).max);
        category = BuildingCategory(uint64(uint192(buildingKind) & type(uint64).max));
    }
}
