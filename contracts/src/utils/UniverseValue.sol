// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library UniverseValue {
    uint256 constant UNIVERSE_MAX = 8192;
    uint256 constant MAJOR_MAX = 100; // 00-99
    uint256 constant MINOR_MAX = 1000; // 000-999
    uint256 constant PATCH_MAX = 10000; // 0000-9999

    // Function to generate a zone based on a tokenId
    function generate(uint256 tokenId) internal pure returns (string memory) {
        uint256 universe = (uint256(keccak256(abi.encode(tokenId, "UNIVERSE"))) % UNIVERSE_MAX) + 1;
        uint256 major = uint256(keccak256(abi.encode(tokenId, "MAJOR"))) % MAJOR_MAX;
        uint256 minor = uint256(keccak256(abi.encode(tokenId, "MINOR"))) % MINOR_MAX;
        uint256 patch = uint256(keccak256(abi.encode(tokenId, "PATCH"))) % PATCH_MAX;

        return string(
            abi.encodePacked(
                formatNumber(universe, 4),
                "-",
                formatNumber(major, 2),
                ".",
                formatNumber(minor, 3),
                ".",
                formatNumber(patch, 4)
            )
        );
    }

    // Utility function to format numbers with leading zeros
    function formatNumber(uint256 number, uint256 length) internal pure returns (string memory) {
        bytes memory buffer = new bytes(length);
        for (uint256 i = length; i > 0; i--) {
            buffer[i - 1] = bytes1(uint8(48 + number % 10));
            number /= 10;
        }
        return string(buffer);
    }
}
