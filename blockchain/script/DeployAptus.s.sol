// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {RoleManager} from "../src/RoleManager.sol";
import {AssetRegistry} from "../src/AssetRegistry.sol";
import {ProvenanceManager} from "../src/ProvenanceManager.sol";
import {OwnershipTransfer} from "../src/OwnershipTransfer.sol";

/**
 * @title DeployAptus
 * @dev Foundry script to deploy the entire APTUS ecosystem sequentially.
 */
contract DeployAptus is Script {

    function run() external {

        // Retrieve the deployer's private key from the environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions to the blockchain network
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the Role Manager (Base security layer)
        RoleManager roleManager = new RoleManager();
        console.log("RoleManager deployed at:", address(roleManager));

        // 2. Deploy the Asset Registry, linking it to the Role Manager
        AssetRegistry assetRegistry = new AssetRegistry(address(roleManager));
        console.log("AssetRegistry deployed at:", address(assetRegistry));

        // 3. Deploy the Provenance Manager
        ProvenanceManager provenanceManager = new ProvenanceManager(
            address(assetRegistry), 
            address(roleManager)
        );
        console.log("ProvenanceManager deployed at:", address(provenanceManager));

        // 4. Deploy the Ownership Transfer Manager for the secondary market
        OwnershipTransfer transferManager = new OwnershipTransfer(address(assetRegistry));
        console.log("OwnershipTransfer deployed at:", address(transferManager));

        // Stop broadcasting transactions
        vm.stopBroadcast();
    }
}