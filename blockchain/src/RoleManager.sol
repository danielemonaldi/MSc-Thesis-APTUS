// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "openzeppelin-contracts/contracts/access/AccessControl.sol";

/**
 * @title RoleManager
 * @dev Manages roles and permissions for the Authenticity & Provenance Traceability Universal System (APTUS) framework.
 * Includes an Identity Registry (KYB) to associate blockchain addresses with verified real-world business identities.
 */
contract RoleManager is AccessControl {
    
    // Defining unique identifiers for the roles

    // Role for "Manufacturer or authorised issuer": can register new assets and mint NFTs
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // Role for "Dealer or authorised reseller": can transfer ownership of assets and NFTs
    bytes32 public constant DEALER_ROLE = keccak256("DEALER_ROLE");

    // Role for "Service centre or authorised maintainer": can add maintenance records
    bytes32 public constant SERVICE_ROLE = keccak256("SERVICE_ROLE");

    // Mapping to store the verified business name associated with a wallet
    mapping(address => string) private entityNames;

    /**
     * @dev Constructor: sets the contract deployer as the System Administrator.
     * The administrator (System administrator / governance authority) can then
     * assign the ISSUER, DEALER and SERVICE roles to other wallets.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        entityNames[msg.sender] = "APTUS System Admin"; // Automatically assign an identity to the admin
    }

    /**
     * @dev Utility function to grant the issuer role to an authorised entity (e.g., a watch brand)
     * and securely assign its real-world business name.
     */
    function grantIssuerRole(address account, string memory companyName) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, account);
        entityNames[account] = companyName;
    }

    /**
     * @dev Utility function to grant the service role to an authorised entity (e.g., a watch service centre)
     * and securely assign its real-world business name.
     */
    function grantServiceRole(address account, string memory companyName) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(SERVICE_ROLE, account);
        entityNames[account] = companyName;
    }

    /**
     * @dev Utility function to grant the dealer role to an authorised entity (e.g., a watch dealer)
     * and securely assign its real-world business name.
     */
    function grantDealerRole(address account, string memory companyName) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(DEALER_ROLE, account);
        entityNames[account] = companyName;
    }

    /**
     * @dev Retrieves the verified business name of a wallet.
     * Can be used by other contracts (like the AssetRegistry) or the Frontend.
     */
    function getEntityName(address account) external view returns (string memory) {
        return entityNames[account];
    }

    /**
     * @dev Revokes the issuer role and clears the associated business identity 
     * only if no other ecosystem roles are held by this account.
     */
    function revokeIssuerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(ISSUER_ROLE, account);
        _checkAndClearIdentity(account);
    }

    /**
     * @dev Revokes the dealer role and clears the associated business identity 
     * only if no other ecosystem roles are held by this account.
     */
    function revokeDealerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(DEALER_ROLE, account);
        _checkAndClearIdentity(account);
    }

    /**
     * @dev Revokes the service role and clears the associated business identity 
     * only if no other ecosystem roles are held by this account.
     */
    function revokeServiceRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        revokeRole(SERVICE_ROLE, account);
        _checkAndClearIdentity(account);
    }

    /**
     * @dev Internal helper to clear the entity name only if the account has lost all active roles.
     */
    function _checkAndClearIdentity(address account) internal {
        bool hasAnyRole = hasRole(ISSUER_ROLE, account) || 
                          hasRole(DEALER_ROLE, account) || 
                          hasRole(SERVICE_ROLE, account);
        
        // If the account has no roles left, wipe its registered entity name
        if (!hasAnyRole) {
            entityNames[account] = "";
        }
    }
}