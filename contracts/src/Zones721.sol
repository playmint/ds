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

    string constant GOO_TYPE_LABEL = "Goo type";
    uint256 constant GOO_TYPE_COUNT = 18;
    string[] private GOO_TYPE_VALUES = [
        "Aromatic Surfactant",
        "Biogenic Mucilage",
        "Biphasic Hydrogel",
        "Confectioner\u2019s Pastillage",
        "Cosmetic Emollient",
        "Echophagic Swarm",
        "Lyotropic Liquid Crystal",
        "Non-Newtonian Pseudoplastic",
        "Petroleum Hydrocarbon",
        "Pharmaceutical Paste",
        "Primum Ens Salum",
        "Programmable Nanotech",
        "Pyroclastic Slurry",
        "[REDACTED]",
        "Rheopectic Synovia",
        "Thixotropic Ground Substance",
        "Unknown Exobiological",
        "Viscoelastic Synthetic Polymer"
    ];

    string constant TILE_ROTATION_LABEL = "Tile rotation";
    uint256 constant TILE_ROTATION_COUNT = 16;
    string[] private TILE_ROTATION_VALUES =
        ["000", "060", "120", "180", "240", "300", "360", "420", "480", "540", "600", "660", "720", "780", "840", "900"];

    string constant HISTORICAL_GOVERNANCE_LABEL = "Historical governance";
    uint256 constant HISTORICAL_GOVERNANCE_COUNT = 12;
    string[] private HISTORICAL_GOVERNANCE_VALUES = [
        "Archeofuturist Patchwork",
        "Autonomous Technocracy",
        "Ex-human Pangalactic Strip Mining",
        "Fully Automated Gay Space Luxury Communism",
        "Hyper-Commodified Capitalism",
        "Interplanetary Technofascist",
        "Omnipresent AI Goddess",
        "Pirate Sea-Steading",
        "Post-Scarcity Technoreclusion",
        "Psychic Megafauna Hypnowar",
        "Recursive Matrioshka Brain",
        "Universal Consciousness Upload"
    ];

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
            GOO_TYPE_LABEL,
            '", "value": "',
            GOO_TYPE_VALUES[getTraitIndex(tokenId, GOO_TYPE_LABEL, GOO_TYPE_COUNT)],
            '"}',
            ",",
            '{"trait_type": "',
            TILE_ROTATION_LABEL,
            '", "value": "',
            TILE_ROTATION_VALUES[getTraitIndex(tokenId, TILE_ROTATION_LABEL, TILE_ROTATION_COUNT)],
            '"}',
            ",",
            '{"trait_type": "',
            HISTORICAL_GOVERNANCE_LABEL,
            '", "value": "',
            HISTORICAL_GOVERNANCE_VALUES[getTraitIndex(
                tokenId, HISTORICAL_GOVERNANCE_LABEL, HISTORICAL_GOVERNANCE_COUNT
            )],
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
