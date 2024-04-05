// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Dispatcher} from "cog/IDispatcher.sol";
import {Node} from "@ds/schema/Schema.sol";
import {Actions} from "@ds/actions/Actions.sol";

struct ItemConfig {
    uint256 id;
    string name;
    string icon;
    uint256 greenGoo;
    uint256 blueGoo;
    uint256 redGoo;
    bool stackable;
    address implementation;
    string plugin;
    bool alwaysActivePlugin;
}

library ItemUtils {
    // Base "resource" ids which are registered during game deployment
    function GreenGoo() internal pure returns (bytes24) {
        return Node.Item("Green Goo", [uint32(1), uint32(0), uint32(0)], true);
    }

    function BlueGoo() internal pure returns (bytes24) {
        return Node.Item("Blue Goo", [uint32(0), uint32(1), uint32(0)], true);
    }

    function RedGoo() internal pure returns (bytes24) {
        return Node.Item("Red Goo", [uint32(0), uint32(0), uint32(1)], true);
    }

    //items that need to spawned with the player
    function AcceptanceLetter() internal pure returns (bytes24) {
        return Node.Item("Acceptance Letter", [uint32(100), uint32(100), uint32(76)], true);
    }

    function IDCard() internal pure returns (bytes24) {
        return Node.Item("ID Card", [uint32(100), uint32(100), uint32(76)], true);
    }

    // register is a helper to declare a new kind of item
    function register(Game ds, ItemConfig memory cfg) internal returns (bytes24) {
        Dispatcher dispatcher = ds.getDispatcher();
        uint32[3] memory outputItemAtoms = [uint32(cfg.greenGoo), uint32(cfg.blueGoo), uint32(cfg.redGoo)];
        bytes24 itemKind = Node.Item(uint32(cfg.id), outputItemAtoms, cfg.stackable);
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (itemKind, cfg.name, cfg.icon)));
        if (address(cfg.implementation) != address(0)) {
            dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_KIND_IMPLEMENTATION, (itemKind, cfg.implementation)));
        }
        if (abi.encodePacked(cfg.plugin).length != 0) {
            dispatcher.dispatch(
                abi.encodeCall(
                    Actions.REGISTER_KIND_PLUGIN,
                    (Node.ClientPlugin(uint64(cfg.id)), itemKind, cfg.name, cfg.plugin, cfg.alwaysActivePlugin)
                )
            );
        }
        return itemKind;
    }
}
