// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {RoleManager} from "./RoleManager.sol";

/**
 * @title AptusAssetRegistry
 * @dev ERC-721 Token representing the digital identity of physical assets (e.g., luxury watches).
 * It relies on AptusRoleManager to enforce access control.
 */
contract AssetRegistry is ERC721URIStorage {

    // Reference to the Role Manager contract for access control
    RoleManager public roleManager;

    // Mapping from token ID to its cryptographic hash to verify off-chain metadata integrity
    mapping(uint256 => bytes32) public assetHashes;

    // Custom error for unauthorized access attempts
    error CallerIsNotIssuer();

    /**
     * @dev Constructor initializes the ERC-721 token and links the Role Manager.
     * @param _roleManagerAddress The address of the deployed RoleManager contract.
     */
    constructor(address _roleManagerAddress) ERC721("AptusDigitalPassport", "APTUS") {
        roleManager = RoleManager(_roleManagerAddress);
    }

    /**
     * @dev Registers a new physical asset by minting its corresponding NFT.
     * Only an authorized issuer (Manufacturer/Dealer) can call this function.
     * 
     * @param to The address receiving the newly minted token (initial owner).
     * @param tokenId The unique identifier for the token (e.g., derived from a serial number).
     * @param tokenUri The URI pointing to the off-chain metadata (e.g., IPFS link).
     * @param assetHash The cryptographic hash of the asset record for integrity checks.
     */
    function registerAsset (
        address to,
        uint256 tokenId,
        string memory tokenUri,
        bytes32 assetHash
    ) external {

        // Check if the caller has the ISSUER_ROLE defined in the Role Manager
        if (!roleManager.hasRole(roleManager.ISSUER_ROLE(), msg.sender)) {
            revert CallerIsNotIssuer();
        }

        // Mint the unique NFT to the specified address
        _mint(to, tokenId);

        // Associate the token with its metadata URI
        _setTokenURI(tokenId, tokenUri);

        // Store the asset hash on-chain to prevent off-chain metadata tampering
        assetHashes[tokenId] = assetHash;
    }
}