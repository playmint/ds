// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import {Schema, Node, Kind, GOO_GREEN, GOO_BLUE, GOO_RED} from "@ds/schema/Schema.sol";
import "@ds/utils/Base64.sol";
import "@ds/utils/LibString.sol";

import {ERC1155} from "solmate/tokens/ERC1155.sol";

using Schema for State;

contract Items1155 is ERC1155 {
    address owner; // The InventoryRule owns this
    State state;

    constructor(address _owner, State _state) {
        owner = _owner;
        state = _state;
    }

    // ERC-1046 compat
    function tokenURI(uint256 tokenId) external view returns (string memory) {
        return getDataURI(tokenId);
    }

    function uri(uint256 tokenId) public view override returns (string memory) {
        return getDataURI(tokenId);
    }

    function getDataURI(uint256 tokenId) internal view returns (string memory) {
        bytes24 itemId = bytes24(uint192(tokenId));

        bytes memory dataURI = abi.encodePacked(
            "{",
            '"name": "',
            state.getDataString(itemId, "name"),
            '",',
            '"description": "Downstream Item",',
            '"image": "https://assets.downstream.game/icons/',
            state.getDataString(itemId, "icon"),
            '.svg",',
            '"attributes": ',
            getDataAttributes(itemId),
            "}"
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(dataURI)));
    }

    function getDataAttributes(bytes24 itemId) internal view returns (bytes memory) {
        (uint32[3] memory goo, bool isStackable) = state.getItemStructure(itemId);
        return abi.encodePacked(
            "[",
            '{"trait_type": "Red", "value": ',
            LibString.toString(goo[GOO_RED]),
            "},",
            '{"trait_type": "Green", "value": ',
            LibString.toString(goo[GOO_GREEN]),
            "},",
            '{"trait_type": "Blue", "value": ',
            LibString.toString(goo[GOO_BLUE]),
            "},",
            '{"trait_type": "Equipable", "value": "',
            (isStackable ? "false" : "true"),
            '"}',
            "]"
        );
    }

    function mint(address to, uint256 tokenId, uint256 amount, bytes memory data) public {
        require(msg.sender == owner, "only the game can mint");
        _mint(to, tokenId, amount, data);
        _updateOwnedToken(address(0), to, tokenId, amount);
    }

    function burn(address from, uint256 tokenId, uint256 amount) public {
        require(msg.sender == owner, "only the game can burn");
        _burn(from, tokenId, amount);
        _updateOwnedToken(from, address(0), tokenId, amount);
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data)
        public
        virtual
        override
    {
        super.safeTransferFrom(from, to, id, amount, data);
        _updateOwnedToken(from, to, id, amount);
    }

    function safeBatchTransferFrom(
        address from,
        address to,
        uint256[] calldata ids,
        uint256[] calldata amounts,
        bytes calldata data
    ) public virtual override {
        super.safeBatchTransferFrom(from, to, ids, amounts, data);

        for (uint256 i = 0; i < ids.length; i++) {
            _updateOwnedToken(from, to, ids[i], amounts[i]);
        }
    }

    function _updateOwnedToken(address from, address to, uint256 tokenId, uint256 amount) public virtual {
        bytes24 itemId = bytes24(uint192(tokenId));

        // decrement from
        if (from != address(0)) {
            bytes24 ownedTokenId = Node.OwnedToken(tokenId, Node.Player(from));
            (bytes24 existingItem, uint64 existingBalance) = state.getItemSlot(ownedTokenId, 0);
            require(existingItem == 0x0 || existingItem == itemId, "invalid from ownedtoken item");
            uint64 newBalance = 0;
            if (existingBalance > uint64(amount)) {
                newBalance = existingBalance - uint64(amount);
            }
            state.setItemSlot(ownedTokenId, 0, itemId, newBalance);
            state.setOwner(ownedTokenId, Node.Player(from));
            // TODO: if newBalance is zero ... remove the owner edge so it doesn't show up in queries
        }

        // increment to
        if (to != address(0)) {
            bytes24 ownedTokenId = Node.OwnedToken(tokenId, Node.Player(to));
            (bytes24 existingItem, uint64 existingBalance) = state.getItemSlot(ownedTokenId, 0);
            require(existingItem == 0x0 || existingItem == itemId, "invalid to ownedtoken item");
            state.setItemSlot(ownedTokenId, 0, itemId, existingBalance + uint64(amount));
            state.setOwner(ownedTokenId, Node.Player(to));
        }
    }
}
