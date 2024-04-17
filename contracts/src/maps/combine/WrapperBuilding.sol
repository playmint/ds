// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {Game} from "cog/IGame.sol";
import {State} from "cog/IState.sol";
import {Schema} from "@ds/schema/Schema.sol";
import {Items1155} from "@ds/Items1155.sol";
import {Actions} from "@ds/actions/Actions.sol";
import {BuildingKind} from "@ds/ext/BuildingKind.sol";
import {ItemMinter, Commands, TokensGetter, DummyMinter} from "./interfaces.sol";

import {ERC20} from "./ERC20.sol";
import {ERC1155} from "./ERC1155.sol";

using Schema for State;

// WrapperBuilding let's you...
// * deposit an ERC20 token and receive a Downstream item
// * withdraw your balance of Downstream item
contract WrapperBuilding is BuildingKind {

    function use(Game ds, bytes24 /*buildingInstance*/, bytes24 actor, bytes calldata payload ) public override {

        TokensGetter dsg = TokensGetter(address(ds));
        State state = ds.getState();
        address playerAddr = state.getOwnerAddress(actor);

        // hackery so we alway have some tokens
        Items1155 minter = Items1155(dsg.tokens());
        minter.mint(address(this), 2610836603857469987925064556474420614715919927787281973348, 1000, "");
        minter.mint(address(this), 2610836603833680502267019323741155680585138469309155115008, 1000, "");
        minter.mint(address(this), 2610836603724646611027692828221479247090561062142748917810, 1000, "");
        DummyMinter orbs = DummyMinter(0x11D61b38F8018CE2c18eDDDA0517a5c4011d43f1);
        orbs.mint(address(this), 1000);

        if (bytes4(payload) == Commands.DEPOSIT.selector) {
            (address fromERC20Contract, uint256 toDownstreamItemId, uint256 amount) = abi.decode(payload[4:], (address,uint256,uint256));
            address toERC1155Contract = address(dsg.tokens());
            deposit(playerAddr, fromERC20Contract, toERC1155Contract, toDownstreamItemId, amount);

        } else if (bytes4(payload) == Commands.WITHDRAW.selector) {
            (uint256 fromDownstreamItemId, address toERC20Contract, uint256 amount) = abi.decode(payload[4:], (uint256,address,uint256));
            address fromERC1155Contract = address(dsg.tokens());
            withdraw(playerAddr, fromERC1155Contract, fromDownstreamItemId, toERC20Contract, amount);

        }
    }

    // swap EXTERNAL-ERC20 -> DOWNSTREAM-1155
    // requires user has approved externalToken
    function deposit(address playerAddr, address fromERC20Contract, address toERC1155Contract, uint256 toDownstreamItemId, uint256 amount) public {
        ERC20 fromContract = ERC20(fromERC20Contract);
        ERC1155 toContract = ERC1155(toERC1155Contract);
        fromContract.transferFrom(playerAddr, address(this), amount);
        toContract.safeTransferFrom(address(this), playerAddr, toDownstreamItemId, amount, "");
    }

    // swap DOWNSTREAM-1155 -> EXTERNAL-ERC20
    // requires user has approved downstreamToken
    function withdraw(address playerAddr, address fromERC1155Contract, uint256 fromDownstreamItemId, address toERC20Contract, uint256 amount) public {
        ERC1155 fromContract = ERC1155(fromERC1155Contract);
        ERC20 toContract = ERC20(toERC20Contract);
        fromContract.safeTransferFrom(playerAddr, address(this), fromDownstreamItemId, amount, "");
        toContract.transferFrom(address(this), playerAddr, amount);
    }
}
