// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "openzeppelin-contracts/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "openzeppelin-contracts/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {RoleManager} from "./RoleManager.sol";

/**
 * @title IProvenanceManager
 * @dev Interface to communicate with ProvenanceManager without causing circular dependency issues.
 */
interface IProvenanceManager {
    function logSystemEvent(uint256 tokenId, string memory eventType, string memory details, address actor) external;
}

/**
 * @title AptusAssetRegistry
 * @dev ERC-721 Token representing the digital identity of physical assets (e.g., luxury watches).
 * It relies on AptusRoleManager to enforce access control, enforces KYB brand identity, 
 * and communicates with ProvenanceManager for automatic lifecycle event logging.
 */
contract AssetRegistry is ERC721URIStorage {

    // Reference to the Role Manager contract for access control and identity (KYB)
    RoleManager public roleManager;

    // Reference to the Provenance Manager for automated event logging
    IProvenanceManager public provenanceManager;

    // Mapping from token ID to its cryptographic hash to verify off-chain metadata integrity
    mapping(uint256 => bytes32) public assetHashes;

    // Custom errors for unauthorized access attempts or identity mismatches
    error CallerIsNotIssuer();
    error NotAdmin();

    /**
     * @dev Constructor initializes the ERC-721 token and links the Role Manager.
     * @param _roleManagerAddress The address of the deployed RoleManager contract.
     */
    constructor(address _roleManagerAddress) ERC721("AptusDigitalPassport", "APTUS") {
        roleManager = RoleManager(_roleManagerAddress);
    }

    /**
     * @dev Links the Registry to the Provenance Manager post-deployment.
     * This resolves the circular dependency issue between the two contracts.
     * Only an administrator can call this function.
     * 
     * @param _provenanceManager The address of the deployed ProvenanceManager contract.
     */
    function setProvenanceManager(address _provenanceManager) external {
        // Check if the caller has the DEFAULT_ADMIN_ROLE (0x00)
        if (!roleManager.hasRole(0x0000000000000000000000000000000000000000000000000000000000000000, msg.sender)) {
            revert NotAdmin();
        }
        provenanceManager = IProvenanceManager(_provenanceManager);
    }

    /**
     * @dev Registers a new physical asset by minting its corresponding NFT.
     * Only an authorized issuer (Manufacturer/Dealer) can call this function.
     * It automatically logs the "CREATED" event in the Provenance Manager.
     * 
     * @param to The address receiving the newly minted token (initial owner).
     * @param tokenId The unique identifier for the token (e.g., derived from a serial number).
     * @param tokenUri The URI pointing to the off-chain metadata (e.g., IPFS link).
     * @param assetHash The cryptographic hash of the asset record for integrity checks.
     * @param brand The name of the brand associated with the asset.
     */
    function registerAsset(
        address to,
        uint256 tokenId,
        string memory tokenUri,
        bytes32 assetHash,
        string memory brand
    ) external {
        // 1. Check if the caller has the ISSUER_ROLE defined in the Role Manager
        if (!roleManager.hasRole(roleManager.ISSUER_ROLE(), msg.sender)) {
            revert CallerIsNotIssuer();
        }

        // 2. Mint the unique NFT to the specified address
        _mint(to, tokenId);

        // 3. Associate the token with its metadata URI
        _setTokenURI(tokenId, tokenUri);

        // 4. Store the asset hash on-chain
        assetHashes[tokenId] = assetHash;

        // 5. Automatically record the creation event passing the entity name of the issuer
        if (address(provenanceManager) != address(0)) {
            string memory issuerName = roleManager.getEntityName(msg.sender);
            provenanceManager.logSystemEvent(
                tokenId, 
                "CREATED", 
                string(abi.encodePacked("Asset officially minted and registered by ", issuerName, " (Brand: ", brand, ").")), 
                msg.sender
            );
        }
    }

    /**
     * @dev Overrides OpenZeppelin's internal _update function to intercept all token transfers
     * and log the "TRANSFERRED" event in the Provenance Manager exactly once.
     */
    function _update(address to, uint256 tokenId, address auth) internal virtual override returns (address) {
        address from = _ownerOf(tokenId);
        address previousOwner = super._update(to, tokenId, auth);

        // Automatically record the transfer event if the Provenance Manager is linked
        // (Excluded from minting events, which are handled in registerAsset)
        if (from != address(0) && to != address(0) && address(provenanceManager) != address(0)) {
            provenanceManager.logSystemEvent(tokenId, "TRANSFERRED", "Ownership transferred securely on-chain.", msg.sender);
        }

        return previousOwner;
    }
}