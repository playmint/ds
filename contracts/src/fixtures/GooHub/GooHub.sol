// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {State} from "cog/IState.sol";
import {Schema, Rel, Node} from "@ds/schema/Schema.sol";
import {ItemUtils} from "@ds/utils/ItemUtils.sol";

using Schema for State;

contract Locker is BuildingKind {
    function use(Game ds, bytes24 buildingInstance, bytes24 mobileUnit, bytes memory /*payload*/ ) public {
        // Decode the function
        State state = ds.getState();
        bytes24 buildingBag = state.getEquipSlot(buildingInstance, 0);

        // Iterate over all bags and slots depositing the goo
        for (uint8 i = 0; i < 3; i++) {
            (bytes24 bag) = state.getEquipSlot(mobileUnit, i);
            for (uint8 j = 0; j < 4; j++) {
                (bytes24 item, uint64 balance) = state.getItemSlot(bag, j);
                if (balance > 0) {
                    (uint32[3] memory inputAtoms, /*bool isStackable*/ ) = state.getItemStructure(item);

                    for (uint8 k; k < inputAtoms.length; k++) {
                        ( /*bytes24 item*/ , uint64 buildingBal) = state.getItemSlot(buildingBag, k);
                        state.setItemSlot(
                            buildingBag,
                            k,
                            k == 0 ? ItemUtils.GreenGoo() : k == 1 ? ItemUtils.BlueGoo() : ItemUtils.RedGoo(),
                            buildingBal + (inputAtoms[k] * balance)
                        );
                    }

                    // Clear item in bag
                    state.setItemSlot(bag, j, bytes24(0), uint64(0));

                    // Unequip bag from unit
                    state.setEquipSlot(mobileUnit, i, bytes24(0));
                }
            }
        }

        // Destroy Mobile Unit
        state.setOwner(mobileUnit, Node.Player(address(0)));
        state.set(Rel.Location.selector, uint8(0), mobileUnit, bytes24(0), 0);
        state.set(Rel.Location.selector, uint8(1), mobileUnit, bytes24(0), 0);
    }
}
