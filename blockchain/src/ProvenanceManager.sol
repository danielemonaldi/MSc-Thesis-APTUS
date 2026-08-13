// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AssetRegistry} from "./AssetRegistry.sol";
import {RoleManager} from "./RoleManager.sol";

/**
 * @title ProvenanceManager
 * @dev Manages the lifecycle events of the assets registered in AssetRegistry.
 * Allows tracking of maintenance, status changes (e.g., stolen), and ownership history.
 */
contract ProvenanceManager {

    AssetRegistry private assetRegistry;
    RoleManager private roleManager;

    // Struct defining a single event in the asset's lifecycle
    struct AssetEvent {
        uint256 timestamp;
        string eventType; // e.g., "CREATED", "MAINTENANCE", "STOLEN", "TRANSFERRED"
        string details;   // Additional details about the event
        address reporter; // Address of the entity reporting the event
    }

    // Mapping from an asset's Token ID to its chronological list of events
    mapping(uint256 => AssetEvent[]) private assetHistory;

    // Custom errors for access control
    error NotAuthorized();

    /**
     * @dev Constructor links the manager to the Registry and Role Manager.
     * @param _assetRegistry Address of the deployed AssetRegistry.
     * @param _roleManager Address of the deployed RoleManager.
     */
    constructor(address _assetRegistry, address _roleManager) {
        assetRegistry = AssetRegistry(_assetRegistry);
        roleManager = RoleManager(_roleManager);
    }

    /**
     * @dev System function called automatically by the AssetRegistry during minting and transfers.
     * Ensures that creation and ownership changes are atomically logged without manual intervention.
     * 
     * @param tokenId The ID of the token/asset.
     * @param eventType The type of system event (e.g., "CREATED" or "TRANSFERRED").
     * @param details Auto-generated description of the event.
     * @param actor The address of the user who triggered the system event.
     */
    function logSystemEvent(uint256 tokenId, string memory eventType, string memory details, address actor) external {
        // Only the AssetRegistry smart contract is allowed to call this function
        if (msg.sender != address(assetRegistry)) {
            revert NotAuthorized();
        }
        
        // Log the system event in the asset's history
        _addEvent(tokenId, eventType, details, actor);
    }

    /**
     * @dev Logs a maintenance event. Only authorized Service Centres can call this.
     * 
     * @param tokenId The ID of the token/asset.
     * @param details Description or IPFS URI of the maintenance report.
     */
    function logMaintenance(uint256 tokenId, string memory details) external {

        // Check if the caller has the SERVICE_ROLE
        if (!roleManager.hasRole(roleManager.SERVICE_ROLE(), msg.sender)) {
            revert NotAuthorized();
        }

        // Implicitly checks if token exists, as ownerOf will revert if it doesn't
        assetRegistry.ownerOf(tokenId); // Ensure the token exists

        // Log the maintenance event in the asset's history
        _addEvent(tokenId, "MAINTENANCE", details, msg.sender);
    }

    /**
     * @dev Allows the current owner of the asset to report it as stolen.
     * 
     * @param tokenId The ID of the token/asset.
     */
    function reportStolen(uint256 tokenId) external {

        // Verify that the caller is the actual current owner of the NFT
        if (assetRegistry.ownerOf(tokenId) != msg.sender) {
            revert NotAuthorized();
        }

        // Log the stolen event in the asset's history
        _addEvent(tokenId, "STOLEN", "Reported stolen by the current owner", msg.sender);
    }

    /**
     * @dev Internal function to append an event to the asset's history.
     */
    function _addEvent(
        uint256 tokenId,
        string memory eventType,
        string memory details,
        address reporter
    ) internal {

        // Append the new event to the asset's history
        assetHistory[tokenId].push(AssetEvent({
            timestamp: block.timestamp,
            eventType: eventType,
            details: details,
            reporter: reporter
        }));
    }

    /**
     * @dev Retrieves the full event history for a given asset.
     * 
     * @param tokenId The ID of the token/asset.
     * @return An array of AssetEvent structs.
     */
    function getAssetHistory(uint256 tokenId) external view returns (AssetEvent[] memory) {
        return assetHistory[tokenId];
    }
}