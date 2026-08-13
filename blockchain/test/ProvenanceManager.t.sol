// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {ProvenanceManager} from "../src/ProvenanceManager.sol";

contract ProvenanceManagerTest is Test {

    RoleManager public roleManager;
    AssetRegistry public assetRegistry;
    ProvenanceManager public provenanceManager;

    // Dummy addresses for actors in the supply chain
    address public admin = address(this);
    address public brandIssuer = address(0x1);
    address public serviceCentre = address(0x2);
    address public watchOwner = address(0x3);
    address public unauthorizedUser = address(0x4);

    // Constant for testing
    uint256 public constant TOKEN_ID = 1;

    function setUp() public {

        // 1. Deploy all necessary contracts
        roleManager = new RoleManager();
        assetRegistry = new AssetRegistry(address(roleManager));
        provenanceManager = new ProvenanceManager(address(assetRegistry), address(roleManager));

        // 2. Grant appropriate roles
        roleManager.grantIssuerRole(brandIssuer, "Rolex");
        roleManager.grantServiceRole(serviceCentre, "Service Geneva");

        // 3. Register (mint) a test asset to the watchOwner to prepare the environment
        vm.prank(brandIssuer);
        assetRegistry.registerAsset(
            watchOwner,
            TOKEN_ID,
            "ipfs://watch-metadata",
            keccak256(abi.encodePacked("Luxury Watch Model Z")),
            "Rolex"
        );
    }

    function test_ServiceCanLogMaintenance() public {
        
        string memory maintenanceDetails = "ipfs://maintenance-report-123";

        // Instruct Foundry to send the next transaction as the authorized service center
        vm.prank(serviceCentre);
        provenanceManager.logMaintenance(TOKEN_ID, maintenanceDetails);

        // Retrieve the event history from the blockchain
        ProvenanceManager.AssetEvent[] memory history = provenanceManager.getAssetHistory(TOKEN_ID);

        // Verify the event was recorded correctly
        assertEq(history.length, 1);
        assertEq(history[0].eventType, "MAINTENANCE");
        assertEq(history[0].details, maintenanceDetails);
        assertEq(history[0].reporter, serviceCentre);
    }

    function test_RevertWhen_UnauthorizedLogsMaintenance() public {

        // Instruct Foundry to send the next transaction as an unauthorized user
        vm.prank(unauthorizedUser);
        
        // Expect this transaction to fail with the NotAuthorized custom error
        vm.expectRevert(ProvenanceManager.NotAuthorized.selector);
        
        // Attempt to log maintenance (should fail)
        provenanceManager.logMaintenance(TOKEN_ID, "ipfs://fake-maintenance");
    }

    function test_OwnerCanReportStolen() public {

        // Instruct Foundry to send the next transaction as the legitimate NFT owner
        vm.prank(watchOwner);
        provenanceManager.reportStolen(TOKEN_ID);

        // Retrieve the event history from the blockchain
        ProvenanceManager.AssetEvent[] memory history = provenanceManager.getAssetHistory(TOKEN_ID);

        // Verify the status change was recorded correctly
        assertEq(history.length, 1);
        assertEq(history[0].eventType, "STOLEN");
        assertEq(history[0].reporter, watchOwner);
    }

    function test_RevertWhen_NonOwnerReportsStolen() public {

        // Instruct Foundry to send the next transaction as someone who does NOT own the NFT
        vm.prank(unauthorizedUser);
        
        // Expect this transaction to fail with the NotAuthorized custom error
        vm.expectRevert(ProvenanceManager.NotAuthorized.selector);
        
        // Attempt to report the watch as stolen (should fail)
        provenanceManager.reportStolen(TOKEN_ID);
    }
}