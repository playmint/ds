// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {State} from "cog/State.sol";
import {Context, Rule} from "cog/Dispatcher.sol";

import {Schema, Node, BiomeKind, Kind} from "@ds/schema/Schema.sol";
import {TileUtils} from "@ds/utils/TileUtils.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BagUtils} from "@ds/utils/BagUtils.sol";

using Schema for State;

uint8 constant MAX_EQUIP_SLOT_INDEX = 254; // There appears to be a problem with state.getEquipSlot if used with 255

contract BagRule is Rule {
    function reduce(State state, bytes calldata action, Context calldata ctx) public returns (State) {
        if (bytes4(action) == Actions.SPAWN_EMPTY_BAG.selector) {
            // decode the action
            (bytes24 equipee) = abi.decode(action[4:], (bytes24));

            _spawnEmptyBag(state, ctx.sender, ctx.clock, equipee);
        }

        if (bytes4(action) == Actions.TRANSFER_BAG_OWNERSHIP.selector) {
            // decode the action
            (bytes24 bag, bytes24 toEntity) = abi.decode(action[4:], (bytes24, bytes24));

            _transferBagOwnership(state, ctx.sender, bag, toEntity);
        }

        if (bytes4(action) == Actions.TRANSFER_BAG.selector) {
            // decode the action
            (bytes24 bag, bytes24 fromEntity, bytes24 toEntity) = abi.decode(action[4:], (bytes24, bytes24, bytes24));

            _transferBag(state, ctx, bag, fromEntity, toEntity);
        }

        return state;
    }

    function _spawnEmptyBag(State state, address sender, uint32 clock, bytes24 equipee) private {
        require(
            _isSenderOwnerOfEntity(state, sender, equipee),
            "BagRule::spawnEmptyBag: Owner of equipee doesn't match sender of action"
        );

        bytes24 bag;
        uint256 inc;
        while (bag == bytes24(0)) {
            bag = Node.Bag(uint64(uint256(keccak256(abi.encode(sender, equipee, clock, inc)))));
            if (state.getOwner(bag) != bytes24(0)) {
                bag = bytes24(0);
                inc++;
            }
        }

        _setOwner(state, bag, equipee);

        (uint8 equipSlot, bool slotFound) = _getNextAvailableEquipSlot(state, equipee);

        require(slotFound, "BagRule::spawnEmptyBag: No more available slots on equipee");

        state.setEquipSlot(equipee, equipSlot, bag);
    }

    function _transferBagOwnership(State state, address sender, bytes24 bag, bytes24 toEntity) private {
        _requireSenderIsOwner(state, sender, bag);

        _setOwner(state, bag, toEntity);
    }

    function _setOwner(State state, bytes24 bag, bytes24 owner) private {
        // Building kinds are directly set as owners whereas with MobileUnits we use the Unit's owner which is a Player
        if (bytes4(owner) == Kind.Building.selector) {
            state.setOwner(bag, owner);
        } else {
            state.setOwner(bag, state.getOwner(owner));
        }
    }

    function _transferBag(State state, Context calldata ctx, bytes24 bag, bytes24 fromEntity, bytes24 toEntity)
        private
    {
        (uint8 equipSlot, bool found) = _getEquipSlotForEquipment(state, fromEntity, bag);
        require(found, "BagRule::_transferBag: Bag is neither equipped to entity or owned by the entity");

        _transferBagAtSlot(state, ctx, equipSlot, fromEntity, toEntity);
    }

    function _transferBagAtSlot(
        State state,
        Context calldata ctx,
        uint8 equipSlot,
        bytes24 fromEntity,
        bytes24 toEntity
    ) private {
        // Check if entity at equipSlot is a bag
        bytes24 bag = state.getEquipSlot(fromEntity, equipSlot);
        require(bytes4(bag) == Kind.Bag.selector, "BagRule::_transferBagAtSlot: Entity at equipSlot not Bag");

        // Allow if either sender is owner of the bag or if sender is owner of the equipee
        require(
            _isSenderOwnerOfEntity(state, ctx.sender, bag) || _isSenderOwnerOfEntity(state, ctx.sender, fromEntity),
            "BagRule::_transferBagAtSlot: Neither sender is owner of the bag or is owner of the equipee"
        );

        BagUtils.requireSameOrAdjacentLocation(state, fromEntity, toEntity, ctx.clock);

        // Unequip from entity
        state.setEquipSlot(fromEntity, equipSlot, bytes24(0));

        _equipToNextAvailableSlot(state, toEntity, bag);
    }

    function _getNextAvailableEquipSlot(State state, bytes24 equipee) private view returns (uint8, bool) {
        for (uint8 i = 0; i <= MAX_EQUIP_SLOT_INDEX; i++) {
            bytes24 heldEquipment = state.getEquipSlot(equipee, i);
            if (heldEquipment == bytes24(0)) {
                return (i, true);
            }
        }

        return (0, false);
    }

    function _equipToNextAvailableSlot(State state, bytes24 equipee, bytes24 equipment) private returns (uint8) {
        (uint8 equipSlot, bool slotFound) = _getNextAvailableEquipSlot(state, equipee);
        require(slotFound, "BagRule::_equipToNextAvailableSlot: No more available slots on equipee");

        state.setEquipSlot(equipee, equipSlot, equipment);

        return equipSlot;
    }

    function _getEquipSlotForEquipment(State state, bytes24 equipee, bytes24 equipment)
        private
        view
        returns (uint8 equipSlot, bool found)
    {
        for (uint8 i = 0; i <= MAX_EQUIP_SLOT_INDEX; i++) {
            if (state.getEquipSlot(equipee, i) == equipment) {
                return (i, true);
            }
        }

        return (0, false);
    }

    // TODO: We can probably get rid of this and just use _isSenderOwnerOfEntity. I found it handy during debugging
    //       as I could see where in the validation it was failing
    function _requireSenderIsOwner(State state, address sender, bytes24 entity) private view {
        // The mess here is that if we are checking what owns a buildingInstance, we say it owns itself
        bytes24 owner = bytes4(entity) == Kind.Building.selector ? entity : state.getOwner(entity);

        // If the owner is a building instance then verify that the sender matches the implementation of the building kind
        if (bytes4(owner) == Kind.Building.selector) {
            bytes24 buildingKind = state.getBuildingKind(owner);
            require(buildingKind != 0x0, "BagRule::_requireSenderIsOwner: no building kind for building id");

            // check sender is the contract that implements the building kind
            address implementation = state.getImplementation(buildingKind);
            require(implementation != address(0), "BagRule::_requireSenderIsOwner: no implementation for building kind");
            require(
                sender == implementation, "BagRule::_requireSenderIsOwner: sender must be BuildingKind implementation"
            );
        } else {
            // If owner isn't a building then assume it is a player
            require(
                Node.Player(sender) == owner, "BagRule::_requireSenderIsOwner: sender isn't the owner of the entity"
            );
        }
    }

    function _isSenderOwnerOfEntity(State state, address sender, bytes24 entity) private view returns (bool) {
        // The mess here is that if we are checking what owns a buildingInstance, we say it owns itself
        bytes24 owner = bytes4(entity) == Kind.Building.selector ? entity : state.getOwner(entity);

        // If the owner is a building instance then verify that the sender matches the implementation of the building kind
        if (bytes4(owner) == Kind.Building.selector) {
            bytes24 buildingKind = state.getBuildingKind(owner);
            if (buildingKind == 0x0) return false;
            // check sender is the contract that implements the building kind
            address implementation = state.getImplementation(buildingKind);
            if (implementation == address(0)) return false;
            return sender == implementation;
        } else {
            // If owner isn't a building then assume it is a player
            return Node.Player(sender) == owner;
        }
    }
}
