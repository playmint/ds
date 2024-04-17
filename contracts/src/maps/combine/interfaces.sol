pragma solidity ^0.8.13;

interface Commands {
    function DEPOSIT(address fromERC20Contract, uint256 toDownstreamItemId, uint256 amount) external;
    function WITHDRAW(uint256 fromDownstreamItemId, address toERC20Contract, uint256 amount) external;
}

interface TokensGetter {
    function tokens() external returns (address);
}

interface ItemMinter {
    function mint(address to, uint256 tokenId, uint256 amount, bytes memory data) external;
}


interface DummyMinter {
    function mint(address to, uint256 value) external;
}
