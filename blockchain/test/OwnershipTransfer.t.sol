// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {OwnershipTransfer} from "../src/OwnershipTransfer.sol";

contract OwnershipTransferTest is Test {

    RoleManager public roleManager;
    AssetRegistry public assetRegistry;
    OwnershipTransfer public transferManager;

    // Dummy addresses representing the actors in the secondary market
    address public brandIssuer = address(0x1);
    address public seller = address(0x2);
    address public buyer = address(0x3);
    address public unauthorizedUser = address(0x4);

    // Constant for the NFT token ID used in tests
    uint256 public constant TOKEN_ID = 100;

    function setUp() public {

        // 1. Deploy the core architecture contracts
        roleManager = new RoleManager();
        assetRegistry = new AssetRegistry(address(roleManager));
        transferManager = new OwnershipTransfer(address(assetRegistry));

        // 2. Setup the initial environment: grant roles and mint a watch to the seller
        roleManager.grantIssuerRole(brandIssuer);

        // 3. The brand issuer registers a new asset (NFT) to the seller
        vm.prank(brandIssuer);
        assetRegistry.registerAsset(
            seller,
            TOKEN_ID,
            "ipfs://watch-metadata",
            keccak256(abi.encodePacked("Watch SN:123"))
        );
    }

    function test_InitiateAndAcceptTransfer() public {

        // Step 1: The current owner (seller) MUST approve the transfer manager contract
        vm.prank(seller);
        assetRegistry.approve(address(transferManager), TOKEN_ID);

        // Step 2: Seller initiates the two-step transfer proposal to the buyer
        vm.prank(seller);
        transferManager.initiateTransfer(TOKEN_ID, buyer);

        // Verify the proposal is correctly logged on-chain
        assertEq(transferManager.pendingTransfers(TOKEN_ID), buyer);

        // Step 3: The proposed buyer accepts the transfer
        vm.prank(buyer);
        transferManager.acceptTransfer(TOKEN_ID);

        // Verify that the NFT ownership has officially changed in the main registry
        assertEq(assetRegistry.ownerOf(TOKEN_ID), buyer);
        
        // Verify that the pending transfer state was cleared to prevent re-entrancy
        assertEq(transferManager.pendingTransfers(TOKEN_ID), address(0));
    }

    function test_RevertWhen_InitiateWithoutApproval() public {

        // The seller attempts to initiate a transfer without calling approve() first
        vm.prank(seller);
        
        // Expect the custom ContractNotApproved error
        vm.expectRevert(OwnershipTransfer.ContractNotApproved.selector);
        
        // Attempt to initiate the transfer, which should fail
        transferManager.initiateTransfer(TOKEN_ID, buyer);
    }

    function test_RevertWhen_WrongUserAccepts() public {

        // Setup: Seller approves and initiates the transfer to the intended buyer
        vm.prank(seller);
        assetRegistry.approve(address(transferManager), TOKEN_ID);

        vm.prank(seller);
        transferManager.initiateTransfer(TOKEN_ID, buyer);

        // A malicious user tries to intercept and accept the transfer
        vm.prank(unauthorizedUser);
        
        // Expect the transaction to fail since the caller is not the proposed owner
        vm.expectRevert(OwnershipTransfer.NotProposedOwner.selector);
        
        // Attempt to accept the transfer, which should revert
        transferManager.acceptTransfer(TOKEN_ID);
    }

    function test_CancelTransfer() public {
        
        // Setup: Seller approves and initiates the transfer
        vm.prank(seller);
        assetRegistry.approve(address(transferManager), TOKEN_ID);

        vm.prank(seller);
        transferManager.initiateTransfer(TOKEN_ID, buyer);

        // The seller changes their mind (e.g., buyer didn't send the funds) and cancels
        vm.prank(seller);
        transferManager.cancelTransfer(TOKEN_ID);

        // Verify that the pending proposal was successfully removed
        assertEq(transferManager.pendingTransfers(TOKEN_ID), address(0));
    }
}