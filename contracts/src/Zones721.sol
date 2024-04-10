// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "cog/IState.sol";
import {Schema, BiomeKind, Node} from "@ds/schema/Schema.sol";
import "@ds/utils/Base64.sol";
import "@ds/utils/LibString.sol";

import {ERC721} from "solmate/tokens/ERC721.sol";

using Schema for State;

error MintPriceNotPaid();
error MaxSupply();
error NonExistentTokenURI();
error WithdrawTransfer();

contract Zones721 is ERC721 {
    uint256 public constant TOTAL_SUPPLY = 32_000;
    uint256 public mintPrice = 1 ether;
    string public baseURI = "https://assets.downstream.game";

    uint256 public currentTokenId;
    address owner; // The ZoneRule owns this
    State state;

    modifier onlyOwner() {
        if (msg.sender != owner) {
            revert("Only the owner can call this function");
        }
        _;
    }

    constructor(address _owner) ERC721("DownstreamZone", "DSZ") {
        owner = _owner;
    }

    function mintTo(address recipient) public payable returns (uint256) {
        if (msg.value != mintPrice) {
            revert MintPriceNotPaid();
        }
        uint256 newTokenId = currentTokenId + 1;
        if (newTokenId > TOTAL_SUPPLY) {
            revert MaxSupply();
        }
        currentTokenId = newTokenId;
        _safeMint(recipient, newTokenId);

        // setup zone data
        int16 zoneKey = int16(uint16(newTokenId));
        bytes24 zoneId = Node.Zone(zoneKey);
        state.setOwner(zoneId, Node.Player(recipient));
        state.setData(zoneId, "name", bytes32(abi.encodePacked("Zone ", LibString.toString(newTokenId))));
        state.setData(zoneId, "description", bytes32(abi.encodePacked("Zone ", LibString.toString(newTokenId))));

        // spawn a single tile
        bytes24 tile = Node.Tile(zoneKey, 0, 0, 0);
        state.setParent(tile, zoneId);
        state.setBiome(tile, BiomeKind.DISCOVERED);
        state.setTileAtomValues(tile, [uint64(255), uint64(255), uint64(255)]);

        return newTokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (ownerOf(tokenId) == address(0)) {
            revert NonExistentTokenURI();
        }
        return getDataURI(tokenId);
    }

    function getDataURI(uint256 tokenId) internal view returns (string memory) {
        bytes24 zoneId = Node.Zone(tokenId);

        bytes memory dataURI = abi.encodePacked(
            "{",
            '"name": "',
            state.getDataString(zoneId, "name"),
            '",',
            '"description": "Downstream Zone #',
            LibString.toString(tokenId),
            '",',
            '"image": "',
            baseURI,
            "/zone/",
            LibString.toString(tokenId),
            '.png",',
            '"attributes": ',
            getDataAttributes(zoneId),
            "}"
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(dataURI)));
    }

    function getDataAttributes(bytes24 zoneId) internal pure returns (bytes memory) {
        uint256 seed = uint32(uint256(keccak256(abi.encodePacked("downstream/se", zoneId))));
        return abi.encodePacked("[", '{"trait_type": "seed", "value": ', LibString.toString(seed), "}", "]");
    }

    function transferFrom(address from, address to, uint256 tokenId) public override {
        super.transferFrom(from, to, tokenId);
        bytes24 zoneId = Node.Zone(tokenId);
        state.setOwner(zoneId, Node.Player(to));
    }

    function registerState(State _state) external onlyOwner {
        state = _state;
    }

    function setMintPrice(uint256 _mintPrice) external onlyOwner {
        mintPrice = _mintPrice;
    }

    function setBaseURI(string memory _baseURI) external onlyOwner {
        baseURI = _baseURI;
    }

    function withdrawPayments(address payable payee) external onlyOwner {
        if (address(this).balance == 0) {
            revert WithdrawTransfer();
        }
        payable(payee).transfer(address(this).balance);
    }
}
