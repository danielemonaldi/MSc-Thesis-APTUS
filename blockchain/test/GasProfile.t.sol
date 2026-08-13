// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {ProvenanceManager} from "../src/ProvenanceManager.sol";
import {OwnershipTransfer} from "../src/OwnershipTransfer.sol";

/**
 * @title APTUS Framework - Gas Profiling Suite
 * @notice Dedicated test suite for empirical validation and gas cost analysis.
 * @dev This contract isolates the "happy path" of the core business logic:
 *      1. Asset Registration (Minting)
 *      2. Direct Transfer (B2B Distribution & Retail Sale)
 *      3. Two-Step Transfer Initiation (P2P Secondary Market)
 *      4. Two-Step Transfer Acceptance (P2P Secondary Market)
 *      5. Provenance Logging (Maintenance)
 *      
 *      By executing only successful transactions, it prevents Foundry's 
 *      `--gas-report` from skewing the average gas costs with the lower 
 *      consumption of reverted edge-case tests.
 * 
 *      Usage: forge test --match-contract GasProfileTest --gas-report
 */
contract GasProfileTest is Test {

    RoleManager roleManager;
    AssetRegistry assetRegistry;
    ProvenanceManager provenanceManager;
    OwnershipTransfer ownershipTransfer;

    address admin = address(1);
    address dealer = address(2);
    address buyer = address(3);

    function setUp() public {
        vm.startPrank(admin);
        
        // 1. Deploy Contracts
        roleManager = new RoleManager();
        assetRegistry = new AssetRegistry(address(roleManager));
        provenanceManager = new ProvenanceManager(address(assetRegistry), address(roleManager));
        ownershipTransfer = new OwnershipTransfer(address(assetRegistry));

        // LINK THE CONTRACTS FOR AUTOMATIC PROVENANCE TRACKING
        assetRegistry.setProvenanceManager(address(provenanceManager));

        // 2. Setup Roles WITH Identities (using the new wrapper functions)
        roleManager.grantIssuerRole(admin, "Rolex");
        roleManager.grantServiceRole(admin, "Rolex");
        roleManager.grantDealerRole(dealer, "Boutique Milano");
        
        vm.stopPrank();
    }

    // Profiling Asset Registration (Minting)
    function testGas_RegisterAsset() public {
        vm.prank(admin);
        assetRegistry.registerAsset(admin, 1, "ipfs://metadata", bytes32(uint256(1)), "Rolex");
    }

    // Profiling Direct Transfer (B2B Distribution or Retail Sale)
    function testGas_DirectTransfer() public {
        // Setup: Mint first
        vm.prank(admin);
        assetRegistry.registerAsset(admin, 1, "ipfs://metadata", bytes32(uint256(1)), "Rolex");

        // Action to profile: Transfer from Issuer to Dealer
        vm.prank(admin);
        assetRegistry.safeTransferFrom(admin, dealer, 1);
    }

    // Profiling Two-Step Transfer Initiation
    function testGas_InitiateTransfer() public {
        // Setup: Mint first
        vm.startPrank(admin);
        assetRegistry.registerAsset(admin, 1, "ipfs://metadata", bytes32(uint256(1)), "Rolex");
        assetRegistry.approve(address(ownershipTransfer), 1);
        
        // Action to profile
        ownershipTransfer.initiateTransfer(1, buyer);
        vm.stopPrank();
    }

    // Profiling Two-Step Transfer Acceptance
    function testGas_AcceptTransfer() public {
        // Setup: Mint and Initiate
        vm.startPrank(admin);
        assetRegistry.registerAsset(admin, 1, "ipfs://metadata", bytes32(uint256(1)), "Rolex");
        assetRegistry.approve(address(ownershipTransfer), 1);
        ownershipTransfer.initiateTransfer(1, buyer);
        vm.stopPrank();

        // Action to profile
        vm.prank(buyer);
        ownershipTransfer.acceptTransfer(1);
    }

    // Profiling Provenance Logging
    function testGas_LogMaintenance() public {
        // Setup: Mint
        vm.prank(admin);
        assetRegistry.registerAsset(admin, 1, "ipfs://metadata", bytes32(uint256(1)), "Rolex");

        // Action to profile
        vm.prank(admin);
        provenanceManager.logMaintenance(1, "Dial replacement");
    }
}