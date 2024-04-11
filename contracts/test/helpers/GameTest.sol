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
import {Zones721} from "@ds/Zones721.sol";

import {CheatsRule} from "@ds/rules/CheatsRule.sol";
import {MovementRule} from "@ds/rules/MovementRule.sol";
import {InventoryRule} from "@ds/rules/InventoryRule.sol";
import {BuildingRule} from "@ds/rules/BuildingRule.sol";
import {CraftingRule} from "@ds/rules/CraftingRule.sol";
import {PluginRule} from "@ds/rules/PluginRule.sol";
import {NewPlayerRule} from "@ds/rules/NewPlayerRule.sol";
import {CombatRule} from "@ds/rules/CombatRule.sol";
import {NamingRule} from "@ds/rules/NamingRule.sol";
import {BagRule} from "@ds/rules/BagRule.sol";
import {ExtractionRule} from "@ds/rules/ExtractionRule.sol";

using Schema for State;

contract Dev {
    Game internal ds;

    uint64 lastBag;

    function spawnTile(int16 z, int16 q, int16 r, int16 s) public {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (z, q, r, s)));
    }

    function setGame(Game game) public {
        ds = game;
    }

    function disableCheats() public {
        ds.getDispatcher().dispatch(abi.encodeCall(Actions.DEV_DISABLE_CHEATS, ()));
    }

    function spawnBag(
        address owner,
        bytes24 equipNode,
        uint8 equipSlot,
        bytes24[] memory resources,
        uint64[] memory qty
    ) public returns (bytes24) {
        State state = ds.getState();
        bytes24 bag = Node.Bag(++lastBag);
        for (uint8 i = 0; i < resources.length; i++) {
            state.setItemSlot(bag, i, resources[i], qty[i]);
        }
        state.setEquipSlot(equipNode, equipSlot, bag);
        if (owner != address(0)) {
            state.setOwner(bag, Node.Player(owner));
        }
        return bag;
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
    Zones721 zoneOwnership;

    // player accounts to test with
    PlayerAccount[4] players;

    constructor() {
        // setup the dev contract for calling cheats
        dev = new Dev();

        zoneOwnership = new Zones721(address(this));
        game = new DownstreamGame(address(this), zoneOwnership);
        zoneOwnership.registerState(game.getState());

        // tests are allowed to directly maniuplate the state
        game.autorizeStateMutation(address(this));
        game.autorizeStateMutation(address(dev));

        // init players
        players[0] = PlayerAccount({key: 0xa1, addr: __vm.addr(0xa1)});
        players[1] = PlayerAccount({key: 0xb2, addr: __vm.addr(0xb2)});
        players[2] = PlayerAccount({key: 0xc3, addr: __vm.addr(0xc3)});
        players[3] = PlayerAccount({key: 0xd4, addr: __vm.addr(0xd4)});

        // TODO: All players are able to directly manipulate the state. This wouldn't be true in a real game.
        // however we would have to make all tests utilize the Rule contracts.
        for (uint256 i = 0; i < players.length; i++) {
            game.autorizeStateMutation(players[i].addr);
        }

        // items
        InventoryRule inventoryRule = new InventoryRule(game);
        tokens = Items1155(inventoryRule.getTokensAddress());

        // The tokens contract directly mutates state. This is how it works within the real game.
        game.autorizeStateMutation(address(tokens));

        // setup game
        game.registerRule(new CheatsRule());
        game.registerRule(new MovementRule(game));
        game.registerRule(inventoryRule);
        game.registerRule(new BuildingRule(game));
        game.registerRule(new CraftingRule(game));
        game.registerRule(new PluginRule());
        game.registerRule(new NewPlayerRule());
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

        // make the dev sender the owner of zone 0
        state.setOwner(Node.Zone(int16(0)), Node.Player(address(dev)));
    }

    function moveMobileUnit(int16 z, int16 q, int16 r, int16 s) public {
        dispatcher.dispatch(abi.encodeCall(Actions.MOVE_MOBILE_UNIT, (z, q, r, s)));
    }

    function spawnMobileUnit() public returns (bytes24) {
        dispatcher.dispatch(abi.encodeCall(Actions.SPAWN_MOBILE_UNIT, ()));
        return Node.MobileUnit(msg.sender);
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
