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
 *      2. Two-Step Transfer Initiation
 *      3. Two-Step Transfer Acceptance
 *      4. Provenance Logging (Maintenance)
 *      
 *      By executing only successful transactions, it prevents Foundry's 
 *      `--gas-report` from skewing the average gas costs with the lower 
 *      consumption of reverted edge-case tests. This ensures accurate 
 *      real-world cost metrics for the Master's Thesis evaluation.
 * 
 *      Usage: forge test --match-contract GasProfileTest --gas-report
 */
contract GasProfileTest is Test {

    RoleManager roleManager;
    AssetRegistry assetRegistry;
    ProvenanceManager provenanceManager;
    OwnershipTransfer ownershipTransfer;

    address admin = address(1);
    address buyer = address(2);

    function setUp() public {

        vm.startPrank(admin);
        
        // 1. Deploy Contracts
        roleManager = new RoleManager();
        assetRegistry = new AssetRegistry(address(roleManager));
        provenanceManager = new ProvenanceManager(address(assetRegistry), address(roleManager));
        ownershipTransfer = new OwnershipTransfer(address(assetRegistry));

        // 2. Setup Roles
        roleManager.grantRole(roleManager.ISSUER_ROLE(), admin);
        roleManager.grantRole(roleManager.SERVICE_ROLE(), admin);
        
        vm.stopPrank();
    }

    // Profiling Asset Registration (Minting)
    function testGas_RegisterAsset() public {

        vm.prank(admin);
        assetRegistry.registerAsset(admin, 1, "ipfs://metadata", bytes32(uint256(1)));
    }

    // Profiling Two-Step Transfer Initiation
    function testGas_InitiateTransfer() public {

        // Setup: Mint first
        vm.startPrank(admin);
        assetRegistry.registerAsset(admin, 1, "ipfs://metadata", bytes32(uint256(1)));
        assetRegistry.approve(address(ownershipTransfer), 1);
        
        // Action to profile
        ownershipTransfer.initiateTransfer(1, buyer);
        vm.stopPrank();
    }

    // Profiling Two-Step Transfer Acceptance
    function testGas_AcceptTransfer() public {

        // Setup: Mint and Initiate
        vm.startPrank(admin);
        assetRegistry.registerAsset(admin, 1, "ipfs://metadata", bytes32(uint256(1)));
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
        assetRegistry.registerAsset(admin, 1, "ipfs://metadata", bytes32(uint256(1)));

        // Action to profile
        vm.prank(admin);
        provenanceManager.logMaintenance(1, "Dial replacement");
    }
}