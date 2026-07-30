// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console} from "forge-std/Test.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";

contract AssetRegistryTest is Test {

    RoleManager public roleManager;
    AssetRegistry public assetRegistry;

    // Dummy addresses for testing purposes
    address public admin = address(this);
    address public brandIssuer = address(0x1);
    address public watchBuyer = address(0x2);
    address public unauthorizedUser = address(0x3);
    
    function setUp() public {

        // 1. Deploy the RoleManager contract
        roleManager = new RoleManager();

        // 2. Deploy the AssetRegistry, linking it to the RoleManager
        assetRegistry = new AssetRegistry(address(roleManager));

        // 3. Grant the ISSUER_ROLE to the brandIssuer address
        roleManager.grantIssuerRole(brandIssuer);
    }

    function test_RevertWhen_UnauthorizedUserRegistersAsset() public {
        
        // Define the watch registration data
        uint256 tokenId = 1;
        string memory tokenUri = "ipfs://fake-metadata";

        // Simulate a cryptographic hash of the physical asset record
        bytes32 assetHash = keccak256(abi.encodePacked("Fake Watch Data"));

        // Tell Foundry that the next call comes from an unauthorized user
        vm.prank(unauthorizedUser);

        // Expect the transaction to revert with the custom error CallerIsNotIssuer
        vm.expectRevert(AssetRegistry.CallerIsNotIssuer.selector);

        // Attempt to register the asset (should fail)
        assetRegistry.registerAsset(watchBuyer, tokenId, tokenUri, assetHash);
    }

    function test_IssuerCanRegisterAsset() public {

        // Define the watch registration data
        uint256 tokenId = 1001; // E.g., unique internal ID
        string memory tokenUri = "ipfs://QmWatchMetadata123";

        // Simulate a cryptographic hash of the physical asset record
        bytes32 assetHash = keccak256(abi.encodePacked("Watch Model X", "SN:123456789"));

        // Tell Foundry that the next call comes from the authorized brand issuer
        vm.prank(brandIssuer);

        // Register the asset
        assetRegistry.registerAsset(watchBuyer, tokenId, tokenUri, assetHash);

        // Verify that the buyer is now the owner of the newly minted NFT
        assertEq(assetRegistry.ownerOf(tokenId), watchBuyer);

        // Verify that the metadata URI was saved correctly
        assertEq(assetRegistry.tokenURI(tokenId), tokenUri);

        // Verify that the cryptographic hash matches the on-chain record for integrity
        assertEq(assetRegistry.assetHashes(tokenId), assetHash);
    }
}