// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "../helpers/GameTest.sol";

import "solmate/tokens/ERC721.sol";
import "@ds/Zones721.sol";

using Schema for State;
using stdStorage for StdStorage;

contract ZoneTest is Test, GameTest {
    function test_RevertMintWithoutValue() public {
        vm.expectRevert(MintPriceNotPaid.selector);
        zoneOwnership.mintTo(address(1));
    }

    function test_mint() public {
        zoneOwnership.mintTo{value: 1 ether}(address(1));
        string memory dataURI1 = zoneOwnership.tokenURI(1);
        console2.log(dataURI1);
        zoneOwnership.mintTo{value: 1 ether}(address(1));
        string memory dataURI2 = zoneOwnership.tokenURI(2);
        console2.log(dataURI2);
    }

    function test_transferZoneOwnership() public {
        // player 0 mints a zone
        zoneOwnership.mintTo{value: 1 ether}(players[0].addr);

        // player 0 spawns a tile
        vm.prank(players[0].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (1, 2, 2, -4)));
        assert(zoneOwnership.ownerOf(1) == players[0].addr);

        // player 0 transfers the zone to player 1
        vm.prank(players[0].addr);
        zoneOwnership.transferFrom(players[0].addr, players[1].addr, 1);
        assert(zoneOwnership.ownerOf(1) == players[1].addr);

        // player 1 spawns a tile
        vm.prank(players[1].addr);
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (1, 3, 3, -6)));

        // player 0 should fail to spawn a tile now
        vm.prank(players[0].addr);
        vm.expectRevert("owner only");
        dispatcher.dispatch(abi.encodeCall(Actions.DEV_SPAWN_TILE, (1, 4, 4, -8)));
    }

    function test_RevertMintMaxSupplyReached() public {
        uint256 slot = stdstore.target(address(zoneOwnership)).sig("currentTokenId()").find();
        bytes32 loc = bytes32(slot);
        bytes32 mockedCurrentTokenId = bytes32(abi.encode(32000));
        vm.store(address(zoneOwnership), loc, mockedCurrentTokenId);
        vm.expectRevert(MaxSupply.selector);
        zoneOwnership.mintTo{value: 1 ether}(address(1));
    }

    function test_RevertMintToZeroAddress() public {
        vm.expectRevert("INVALID_RECIPIENT");
        zoneOwnership.mintTo{value: 1 ether}(address(0));
    }

    function test_NewMintOwnerRegistered() public {
        zoneOwnership.mintTo{value: 1 ether}(address(1));
        uint256 slotOfNewOwner =
            stdstore.target(address(zoneOwnership)).sig(zoneOwnership.ownerOf.selector).with_key(address(1)).find();

        uint160 ownerOfTokenIdOne =
            uint160(uint256((vm.load(address(zoneOwnership), bytes32(abi.encode(slotOfNewOwner))))));
        assertEq(address(ownerOfTokenIdOne), address(1));
    }

    function test_BalanceIncremented() public {
        zoneOwnership.mintTo{value: 1 ether}(address(1));
        uint256 slotBalance =
            stdstore.target(address(zoneOwnership)).sig(zoneOwnership.balanceOf.selector).with_key(address(1)).find();

        uint256 balanceFirstMint = uint256(vm.load(address(zoneOwnership), bytes32(slotBalance)));
        assertEq(balanceFirstMint, 1);

        zoneOwnership.mintTo{value: 1 ether}(address(1));
        uint256 balanceSecondMint = uint256(vm.load(address(zoneOwnership), bytes32(slotBalance)));
        assertEq(balanceSecondMint, 2);
    }

    function test_SafeContractReceiver() public {
        Receiver receiver = new Receiver();
        zoneOwnership.mintTo{value: 1 ether}(address(receiver));
        uint256 slotBalance = stdstore.target(address(zoneOwnership)).sig(zoneOwnership.balanceOf.selector).with_key(
            address(receiver)
        ).find();

        uint256 balance = uint256(vm.load(address(zoneOwnership), bytes32(slotBalance)));
        assertEq(balance, 1);
    }

    function test_RevertUnSafeContractReceiver() public {
        // Adress set to 11, because first 10 addresses are restricted for precompiles
        vm.etch(address(11), bytes("mock code"));
        vm.expectRevert(bytes(""));
        zoneOwnership.mintTo{value: 1 ether}(address(11));
    }

    function test_WithdrawalWorksAsOwner() public {
        // Mint an zoneOwnership, sending eth to the contract
        Receiver receiver = new Receiver();
        address payable payee = payable(address(0x1337));
        uint256 priorPayeeBalance = payee.balance;
        zoneOwnership.mintTo{value: zoneOwnership.mintPrice()}(address(receiver));
        // Check that the balance of the contract is correct
        assertEq(address(zoneOwnership).balance, zoneOwnership.mintPrice());
        uint256 nftBalance = address(zoneOwnership).balance;
        // Withdraw the balance and assert it was transferred
        zoneOwnership.withdrawPayments(payee);
        assertEq(payee.balance, priorPayeeBalance + nftBalance);
    }

    function test_WithdrawalFailsAsNotOwner() public {
        // Mint an zoneOwnership, sending eth to the contract
        Receiver receiver = new Receiver();
        zoneOwnership.mintTo{value: zoneOwnership.mintPrice()}(address(receiver));
        // Check that the balance of the contract is correct
        assertEq(address(zoneOwnership).balance, zoneOwnership.mintPrice());
        // Confirm that a non-owner cannot withdraw
        vm.expectRevert("Only the owner can call this function");
        vm.startPrank(address(0xd3ad));
        zoneOwnership.withdrawPayments(payable(address(0xd3ad)));
        vm.stopPrank();
    }
}

contract Receiver is ERC721TokenReceiver {
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }
}
