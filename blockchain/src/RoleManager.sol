// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "openzeppelin-contracts/contracts/access/AccessControl.sol";

/**
 * @title RoleManager
 * @dev Manages roles and permissions for the Authenticity & Provenance Traceability Universal System (APTUS) framework.
 */
contract RoleManager is AccessControl {
    
    // Defining unique identifiers for the roles

    // Role for "Manufacturer or authorised issuer": can register new assets and mint NFTs
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");

    // Role for "Dealer or authorised reseller": can transfer ownership of assets and NFTs
    bytes32 public constant DEALER_ROLE = keccak256("DEALER_ROLE");

    // Role for "Service centre or authorised maintainer": can add maintenance records
    bytes32 public constant SERVICE_ROLE = keccak256("SERVICE_ROLE");

    /**
     * @dev Constructor: sets the contract deployer as the System Administrator.
     * The administrator (System administrator / governance authority) can then
     * assign the ISSUER, DEALER and SERVICE roles to other wallets.
     */
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    /**
     * @dev Utility function to grant the issuer role to an authorised entity (e.g., a watch brand).
     */
    function grantIssuerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(ISSUER_ROLE, account);
    }

    /**
     * @dev Utility function to grant the service role to an authorised entity (e.g., a watch service centre).
     */
    function grantServiceRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(SERVICE_ROLE, account);
    }

    /**
     * @dev Utility function to grant the dealer role to an authorised entity (e.g., a watch dealer).
     */
    function grantDealerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(DEALER_ROLE, account);
    }
}