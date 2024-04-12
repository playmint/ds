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
    uint256 public constant TOTAL_SUPPLY = 32_000; // basically the int16 limit of the map
    uint256 public mintPrice = 1 ether;
    string public baseURI = "https://assets.downstream.game";

    uint256 public currentTokenId;
    address owner; // The ZoneRule owns this
    State state;

    string constant DRIVING_SIDE_LABEL = "DrivingSide";
    uint256 constant DRIVING_SIDE_COUNT = 3;
    string[] private DRIVING_SIDE_VALUES = ["left", "right", "whatever"];

    string constant CLIMATE_LABEL = "Climate";
    uint256 constant CLIMATE_COUNT = 7;
    string[] private CLIMATE_VALUES =
        ["damn cold", "endless drizzle", "arid", "tropical", "humid", "sweaty", "hot as hades"];

    string constant GOVERNMENT_LABEL = "Government";
    uint256 constant GOVERNMENT_COUNT = 7;
    string[] private GOVERNMENT_VALUES =
        ["empire", "cyberocracy", "bureaucracy", "theocracy", "hexalopoly", "hive mind", "demarchy"];

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
            getDataAttributes(tokenId),
            "}"
        );
        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(dataURI)));
    }

    function getTraitIndex(uint256 tokenId, string memory traitName, uint256 traitCount)
        private
        pure
        returns (uint256)
    {
        return pluckTrait(tokenId, traitName, traitCount);
    }

    function getTraitName(uint256 tokenId, string memory traitName, string[] storage traitList)
        private
        view
        returns (string memory)
    {
        uint256 index = getTraitIndex(tokenId, traitName, traitList.length);
        return traitList[index];
    }

    function pluckTrait(uint256 tokenId, string memory keyPrefix, uint256 traitCount) internal pure returns (uint256) {
        uint256 rand = randomish(string(abi.encodePacked(keyPrefix, LibString.toString(tokenId))));
        uint256 index = rand % traitCount;
        return index;
    }

    function randomish(string memory input) internal pure returns (uint256) {
        return uint256(keccak256(abi.encodePacked(input)));
    }

    function getDataAttributes(uint256 tokenId) internal view returns (bytes memory) {
        return abi.encodePacked(
            "[",
            '{"trait_type": "',
            DRIVING_SIDE_LABEL,
            '", "value": "',
            DRIVING_SIDE_VALUES[getTraitIndex(tokenId, DRIVING_SIDE_LABEL, DRIVING_SIDE_COUNT)],
            '"}',
            ",",
            '{"trait_type": "',
            CLIMATE_LABEL,
            '", "value": "',
            CLIMATE_VALUES[getTraitIndex(tokenId, CLIMATE_LABEL, CLIMATE_COUNT)],
            '"}',
            ",",
            '{"trait_type": "',
            GOVERNMENT_LABEL,
            '", "value": "',
            GOVERNMENT_VALUES[getTraitIndex(tokenId, GOVERNMENT_LABEL, GOVERNMENT_COUNT)],
            '"}',
            "]"
        );
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
