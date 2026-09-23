# APTUS: Authenticity & Provenance Traceability Universal System

![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=Ethereum&logoColor=white)
![Foundry](https://img.shields.io/badge/Foundry-FF0000?style=for-the-badge&logo=Rust&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![IPFS](https://img.shields.io/badge/IPFS-65C2CB?style=for-the-badge&logo=ipfs&logoColor=white)

**APTUS** is a decentralized framework designed to manage the authenticity, provenance, and lifecycle traceability of high-value physical assets (with a focus on luxury watches). By bridging the physical-digital gap, it transforms tangible goods into verifiable digital identities, eliminating information asymmetry in the secondary market.

## 🌟 Key Features

- **Digital Passports (ERC-721):** 1-to-1 representation of physical assets as Non-Fungible Tokens linked to immutable IPFS metadata.
- **On-Chain KYB (Know Your Business):** A Role-Based Access Control system that binds anonymous Ethereum wallet addresses to verified corporate entities (e.g., Brands, Authorized Dealers).
- **Two-Step Handshake Protocol:** A secure peer-to-peer ownership transfer mechanism that protects users from accidental token loss and unsolicited airdrops.
- **Lifecycle & Provenance Tracking:** Decoupled architecture allowing authorized service centers to append maintenance logs, and owners to flag items as "Stolen" or "Lost", immediately freezing P2P transfers.
- **Privacy-First Design:** Client-side `keccak256` hashing of physical serial numbers prevents sensitive data exposure in the public mempool.

---

## 📂 Repository Structure

The project is divided into two main environments to strictly separate the smart contract backend from the user-facing application:

```text
📦 APTUS-Framework
 ┣ 📂 blockchain/      # Smart contracts, deployment scripts, and testing (Foundry)
 ┗ 📂 dapp/            # Decentralized application and UI (Next.js & React)
```

### 1. The `blockchain` Directory
Located in `/blockchain`, this directory contains the core business logic of the framework. It is built using **Foundry**, a blazing-fast, Rust-based Ethereum development environment.

**Core Smart Contracts:**
- `RoleManager.sol`: Manages granular permissions (Issuer, Dealer, Service) and the on-chain KYB identity registry.
- `AssetRegistry.sol`: The core ERC-721 implementation handling token minting and metadata URI binding.
- `ProvenanceManager.sol`: An append-only cryptographic ledger dedicated to recording lifecycle events (e.g., maintenance, status changes).
- `OwnershipTransfer.sol`: Governs the secure Two-Step Handshake logic for secondary market transfers.

### 2. The `dApp` Directory
Located in `/dapp`, this directory contains the Web3 front-end application built with **Next.js**, **Tailwind CSS**, and **Wagmi/Viem**. It provides role-specific dashboards for all actors in the supply chain.

**Core Modules:**
- **Admin Control Panel:** Interface for governance and KYB role assignment.
- **Issuer & Distribution Dashboards:** Used by manufacturers to mint metadata to IPFS (via Pinata) and transfer assets down the B2B supply chain.
- **Customer Vault:** A private inventory management tool for collectors, featuring the P2P Transfer Center and Stolen Asset reporting.
- **Public Explorer:** A transparency tool for prospective buyers to verify authenticity, ownership, and provenance timelines before a purchase.

---

## 🚀 Getting Started

### Prerequisites
- [Foundry](https://book.getfoundry.sh/getting-started/installation) (Forge & Anvil)
- [Node.js](https://nodejs.org/) (v18 or higher)
- [MetaMask](https://metamask.io/) or any Web3 wallet

### 1. Smart Contract Setup (`/blockchain`)
Navigate to the blockchain directory and install dependencies:
```bash
cd blockchain
forge install
```
Start a local Anvil node to simulate the Ethereum network:
```bash
anvil
```
In a new terminal window, deploy the contracts locally:
```bash
forge script script/DeployAptus.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

### 2. dApp Setup (`/dapp`)
Navigate to the frontend directory and install dependencies:
```bash
cd ../dapp
npm install
```
Create a `.env.local` file in the root of the `dapp` folder and add your Pinata/IPFS credentials and the deployed contract addresses:
```env
# Pinata IPFS Integration
PINATA_JWT=your_pinata_jwt_token_here
NEXT_PUBLIC_GATEWAY_URL=your_pinata_gateway_url

# Smart Contract Addresses (Local or Sepolia)
NEXT_PUBLIC_ROLE_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_PROVENANCE_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_OWNERSHIP_TRANSFER_ADDRESS=0x...
```
Start the development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to interact with the application.

---

## 📄 License & Academic Context
This project was developed as part of a Master's Thesis in Computer Science at the University of Camerino (Italy). It serves as a Proof of Concept (PoC) for exploring decentralized supply chains and digital product passports.