// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AssetRegistry} from "./AssetRegistry.sol";

/**
 * @title OwnershipTransfer
 * @dev Manages the secure two-step transfer of asset ownership for the secondary market.
 * Prevents accidental transfers to wrong addresses by requiring the receiver to accept it.
 */
contract OwnershipTransfer {

    AssetRegistry public assetRegistry;

    // Mapping from Token ID to the proposed new owner address
    mapping(uint256 => address) public pendingTransfers;

    // Custom errors for security and gas optimization
    error NotOwner();
    error NotProposedOwner();
    error TransferNotInitiated();
    error ContractNotApproved();

    // Events for off-chain traceability (e.g., listening via frontend)
    event TransferInitiated(uint256 indexed tokenId, address indexed currentOwner, address indexed proposedOwner);
    event TransferCompleted(uint256 indexed tokenId, address indexed previousOwner, address indexed newOwner);
    event TransferCancelled(uint256 indexed tokenId, address indexed currentOwner);

    /**
     * @dev Constructor links the transfer manager to the main Asset Registry.
     * @param _assetRegistry Address of the deployed AssetRegistry.
     */
    constructor(address _assetRegistry) {
        assetRegistry = AssetRegistry(_assetRegistry);
    }

    /**
     * @dev Step 1: The current owner proposes a transfer to a new address.
     * IMPORTANT: The current owner MUST approve this contract on the ERC-721 first.
     * 
     * @param tokenId The ID of the asset to transfer.
     * @param proposedOwner The address of the intended buyer/receiver.
     */
    function initiateTransfer(uint256 tokenId, address proposedOwner) external {

        // Verify caller is the current owner of the NFT
        if (assetRegistry.ownerOf(tokenId) != msg.sender) {
            revert NotOwner();
        }

        // Verify this specific contract has been approved to move the NFT
        if (assetRegistry.getApproved(tokenId) != address(this)) {
            revert ContractNotApproved();
        }

        // Register the proposal
        pendingTransfers[tokenId] = proposedOwner;

        emit TransferInitiated(tokenId, msg.sender, proposedOwner);
    }

    /**
     * @dev Step 2: The proposed owner accepts the transfer and receives the NFT.
     * 
     * @param tokenId The ID of the asset being transferred.
     */
    function acceptTransfer(uint256 tokenId) external {

        address proposedOwner = pendingTransfers[tokenId];
        
        // Ensure a transfer was actually proposed for this token
        if (proposedOwner == address(0)) {
            revert TransferNotInitiated();
        }

        // Ensure only the designated receiver can accept the transfer
        if (msg.sender != proposedOwner) {
            revert NotProposedOwner();
        }

        address currentOwner = assetRegistry.ownerOf(tokenId);

        // Clear the pending transfer state BEFORE executing to prevent Reentrancy attacks
        delete pendingTransfers[tokenId];

        // Execute the actual ERC-721 token transfer
        assetRegistry.safeTransferFrom(currentOwner, msg.sender, tokenId);

        emit TransferCompleted(tokenId, currentOwner, msg.sender);
    }

    /**
     * @dev Cancels a pending transfer proposal. Can only be called by the current owner.
     * 
     * @param tokenId The ID of the asset.
     */
    function cancelTransfer(uint256 tokenId) external {
        
        // Verify caller is still the current owner
        if (assetRegistry.ownerOf(tokenId) != msg.sender) {
            revert NotOwner();
        }

        // Clear the pending state
        delete pendingTransfers[tokenId];
        
        emit TransferCancelled(tokenId, msg.sender);
    }
}