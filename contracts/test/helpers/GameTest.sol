// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/Vm.sol";

import "cog/IState.sol";
import "cog/BaseDispatcher.sol";
import "cog/IGame.sol";

import {DownstreamGame, PREFIX_MESSAGE} from "@ds/Downstream.sol";
import {Actions, BiomeKind} from "@ds/actions/Actions.sol";
import "@ds/schema/Schema.sol";
import "@ds/utils/ItemUtils.sol";
import {Items1155} from "@ds/Items1155.sol";

import {CheatsRule} from "@ds/rules/CheatsRule.sol";
import {MovementRule} from "@ds/rules/MovementRule.sol";
import {ScoutRule} from "@ds/rules/ScoutRule.sol";
import {InventoryRule} from "@ds/rules/InventoryRule.sol";
import {BuildingRule} from "@ds/rules/BuildingRule.sol";
import {CraftingRule} from "@ds/rules/CraftingRule.sol";
import {PluginRule} from "@ds/rules/PluginRule.sol";
import {NewPlayerRule} from "@ds/rules/NewPlayerRule.sol";
import {CombatRule} from "@ds/rules/CombatRule.sol";
import {NamingRule} from "@ds/rules/NamingRule.sol";
import {BagRule} from "@ds/rules/BagRule.sol";
import {ExtractionRule} from "@ds/rules/ExtractionRule.sol";

contract Dev {
    Game internal ds;

    uint64 lastBag;

    function spawnTile(int16 q, int16 r, int16 s) public {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (q, r, s)));
    }

    function spawnBag(
        address owner,
        bytes24 equipNode,
        uint8 equipSlot,
        bytes24[] memory resources,
        uint64[] memory qty
    ) public returns (bytes24) {
        bytes24 bagID = Node.Bag(++lastBag);
        ds.getDispatcher().dispatch(
            abi.encodeCall(Actions.DEV_SPAWN_BAG, (bagID, owner, equipNode, equipSlot, resources, qty))
        );
        return bagID;
    }

    function spawnFullBag(address owner, bytes24 equipNode, uint8 equipSlot) public returns (bytes24) {
        bytes24[] memory items = new bytes24[](3);
        items[0] = ItemUtils.GreenGoo();
        items[1] = ItemUtils.BlueGoo();
        items[2] = ItemUtils.RedGoo();

        uint64[] memory balances = new uint64[](3);
        balances[0] = 100;
        balances[1] = 100;
        balances[2] = 100;

        return spawnBag(owner, equipNode, equipSlot, items, balances);
    }

    function setGame(Game game) public {
        ds = game;
    }

    function disableCheats() public {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_DISABLE_CHEATS, ()));
    }
}

struct PlayerAccount {
    uint256 key;
    address addr;
}

abstract contract GameTest {
    DownstreamGame internal game;
    BaseDispatcher internal dispatcher;
    State internal state;
    Dev internal dev;
    Vm internal __vm = Vm(0x7109709ECfa91a80626fF3989D68f67F5b1DD12D);
    Items1155 tokens;

    // player accounts to test with
    PlayerAccount[4] players;

    constructor() {
        // setup the dev contract for calling cheats
        dev = new Dev();
        game = new DownstreamGame(address(this));

        // init players
        players[0] = PlayerAccount({key: 0xa1, addr: __vm.addr(0xa1)});
        players[1] = PlayerAccount({key: 0xb2, addr: __vm.addr(0xb2)});
        players[2] = PlayerAccount({key: 0xc3, addr: __vm.addr(0xc3)});
        players[3] = PlayerAccount({key: 0xd4, addr: __vm.addr(0xd4)});

        // allow all the players
        address[] memory allowlist = new address[](4);
        allowlist[0] = players[0].addr;
        allowlist[1] = players[1].addr;
        allowlist[2] = players[2].addr;
        allowlist[3] = players[3].addr;

        // items
        InventoryRule inventoryRule = new InventoryRule(game);
        tokens = Items1155(inventoryRule.getTokensAddress());

        // setup game
        game.registerRule(new CheatsRule(address(dev)));
        game.registerRule(new MovementRule(game));
        game.registerRule(new ScoutRule());
        game.registerRule(inventoryRule);
        game.registerRule(new BuildingRule(game));
        game.registerRule(new CraftingRule(game));
        game.registerRule(new PluginRule());
        game.registerRule(new NewPlayerRule(allowlist));
        game.registerRule(new CombatRule());
        game.registerRule(new NamingRule());
        game.registerRule(new BagRule());
        game.registerRule(new ExtractionRule(game));
        dev.setGame(game);

        // fetch the State
        state = game.getState();

        // register base goos
        dispatcher = BaseDispatcher(address(game.getDispatcher()));
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.GreenGoo(), "Green Goo", "15-185")));
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.BlueGoo(), "Blue Goo", "32-96")));
        dispatcher.dispatch(abi.encodeCall(Actions.REGISTER_ITEM_KIND, (ItemUtils.RedGoo(), "Red Goo", "22-256")));
    }

    function moveMobileUnit(uint32 id, int16 q, int16 r, int16 s) public {
        dispatcher.dispatch(abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (id, q, r, s)));
    }

    function spawnMobileUnit(uint64 id) public returns (bytes24) {
        bytes24 unitID = Node.MobileUnit(id);
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, (unitID)));
        return unitID;
    }

    function scoutMobileUnit(uint32 id, int16 q, int16 r, int16 s) public {
        dispatcher.dispatch(
            abi.encodeCall(
                Actions.SCOUT_MOBILE_UNIT,
                (
                    id, // mobileUnit id (sid)
                    q, // q
                    r, // r
                    s // s
                )
            )
        );
    }

    function setName(bytes24 entity, string memory name) public {
        dispatcher.dispatch(abi.encodeCall(Actions.NAME_OWNED_ENTITY, (entity, name)));
    }

    function transferItem(
        bytes24 actor,
        bytes24[2] memory equipees,
        uint8[2] memory equipSlots,
        uint8[2] memory itemSlots,
        bytes24 bagID,
        uint64 qty
    ) public {
        dispatcher.dispatch(
            abi.encodeCall(Actions.TRANSFER_ITEM_MOBILE_UNIT, (actor, equipees, equipSlots, itemSlots, bagID, qty))
        );
    }
}
