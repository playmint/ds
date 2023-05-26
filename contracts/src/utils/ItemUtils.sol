// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {BaseGame} from "cog/Game.sol";
import {Dispatcher} from "cog/Dispatcher.sol";
import {Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

struct ItemConfig {
    uint256 id;
    string name;
    string icon;
    uint256 life;
    uint256 defense;
    uint256 attack;
    bool stackable;
    address implementation;
    string plugin;
}

library ItemUtils {
    // temp base "resource" ids used by scouting
    // these should not really be special, they are simply
    // how we seed the world with atoms at the moment by
    // dropping these per-atom resources in bags during scout
    function Kiki() internal pure returns (bytes24) {
        return Node.Item("kiki", [uint32(2), uint32(0), uint32(0)], true);
    }

    function Bouba() internal pure returns (bytes24) {
        return Node.Item("bouba", [uint32(0), uint32(2), uint32(0)], true);
    }

    function Semiote() internal pure returns (bytes24) {
        return Node.Item("semiote", [uint32(0), uint32(0), uint32(2)], true);
    }

    // register is a helper to declare a new kind of item
    function register(BaseGame ds, ItemConfig memory cfg) internal returns (bytes24) {
        Dispatcher dispatcher = ds.getDispatcher();
        uint32[3] memory outputItemAtoms = [uint32(cfg.life), uint32(cfg.defense), uint32(cfg.attack)];
        bytes24 itemKind = Node.Item(uint32(cfg.id), outputItemAtoms, cfg.stackable);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (itemKind, cfg.name, cfg.icon)));
        if (address(cfg.implementation) != address(0)) {
            dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (itemKind, cfg.implementation)));
        }
        if (abi.encodePacked(cfg.plugin).length != 0) {
            dispatcher.dispatch(
                abi.encodeCall(
                    Actions.REGISTER_KIND_PLUGIN, (Node.ClientPlugin(uint64(cfg.id)), itemKind, cfg.name, cfg.plugin)
                )
            );
        }
        return itemKind;
    }
}
