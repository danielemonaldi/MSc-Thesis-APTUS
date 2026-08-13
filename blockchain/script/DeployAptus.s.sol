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

    /**
     * @dev Main deployment logic executed by Foundry.
     */
    function run() external {

        // Retrieve the deployer's private key from the environment variables (.env)
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        // Start broadcasting transactions to the blockchain network using the deployer's account
        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy the Role Manager (Base security layer)
        // This must be deployed first as all other contracts rely on it for access control.
        RoleManager roleManager = new RoleManager();
        console.log("RoleManager deployed at:", address(roleManager));

        // 2. Deploy the Asset Registry
        // Links the registry to the Role Manager to enforce the ISSUER_ROLE during minting.
        AssetRegistry assetRegistry = new AssetRegistry(address(roleManager));
        console.log("AssetRegistry deployed at:", address(assetRegistry));

        // 3. Deploy the Provenance Manager
        // Links to both the Registry (to check token existence/ownership) and the Role Manager (for SERVICE_ROLE).
        ProvenanceManager provenanceManager = new ProvenanceManager(
            address(assetRegistry), 
            address(roleManager)
        );
        console.log("ProvenanceManager deployed at:", address(provenanceManager));

        // ------------------------------------------------------------------------
        // LINKING PHASE: Resolving Circular Dependency
        // The AssetRegistry needs to know the address of the ProvenanceManager to 
        // automatically log "CREATED" and "TRANSFERRED" events. Since ProvenanceManager 
        // was deployed after AssetRegistry, we link them here post-deployment.
        // ------------------------------------------------------------------------
        assetRegistry.setProvenanceManager(address(provenanceManager));
        console.log("AssetRegistry successfully linked to ProvenanceManager");

        // 4. Deploy the Ownership Transfer Manager
        // Handles the two-step peer-to-peer secure transfer mechanism for the secondary market.
        OwnershipTransfer transferManager = new OwnershipTransfer(address(assetRegistry));
        console.log("OwnershipTransfer deployed at:", address(transferManager));

        // Stop broadcasting transactions
        vm.stopBroadcast();
    }
}