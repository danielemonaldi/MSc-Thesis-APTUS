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
    address public authorizedDealer = address(0x4);
    
    function setUp() public {
        // 1. Deploy the RoleManager contract
        roleManager = new RoleManager();

        // 2. Deploy the AssetRegistry, linking it to the RoleManager
        assetRegistry = new AssetRegistry(address(roleManager));

        // 3. Grant roles WITH identity (KYB)
        roleManager.grantIssuerRole(brandIssuer, "Rolex");
        roleManager.grantDealerRole(authorizedDealer, "Boutique Milano");
    }

    function test_RevertWhen_UnauthorizedUserRegistersAsset() public {
        uint256 tokenId = 1;
        string memory tokenUri = "ipfs://fake-metadata";
        bytes32 assetHash = keccak256(abi.encodePacked("Fake Watch Data"));

        vm.prank(unauthorizedUser);
        vm.expectRevert(AssetRegistry.CallerIsNotIssuer.selector);

        // The unauthorized user tries to mint. They don't have the role, so it reverts immediately.
        assetRegistry.registerAsset(watchBuyer, tokenId, tokenUri, assetHash, "Rolex");
    }

    function test_IssuerCanRegisterAndDistributeAsset() public {
        uint256 tokenId = 1001;
        string memory tokenUri = "ipfs://QmWatchMetadata123";
        bytes32 assetHash = keccak256(abi.encodePacked("Watch Model X", "SN:123456789"));

        // Step 1: Issuer mints the asset to their own vault
        vm.prank(brandIssuer);
        // We pass the exact brand name granted in the setUp to pass the KYB check
        assetRegistry.registerAsset(brandIssuer, tokenId, tokenUri, assetHash, "Rolex");

        assertEq(assetRegistry.ownerOf(tokenId), brandIssuer);
        assertEq(assetRegistry.tokenURI(tokenId), tokenUri);
        assertEq(assetRegistry.assetHashes(tokenId), assetHash);

        // Step 2: B2B Distribution - Issuer transfers to Dealer
        vm.prank(brandIssuer);
        assetRegistry.safeTransferFrom(brandIssuer, authorizedDealer, tokenId);

        assertEq(assetRegistry.ownerOf(tokenId), authorizedDealer);

        // Step 3: Retail Sale - Dealer transfers to Final Customer
        vm.prank(authorizedDealer);
        assetRegistry.safeTransferFrom(authorizedDealer, watchBuyer, tokenId);

        assertEq(assetRegistry.ownerOf(tokenId), watchBuyer);
    }
}