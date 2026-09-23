# APTUS Smart Contracts

This directory contains the immutable blockchain backend for the **APTUS Framework**, developed using [Foundry](https://book.getfoundry.sh/). 

The architecture is deliberately decoupled into distinct modular components to simplify testing, isolate business logic, and reduce the overall attack surface.

## 🏗 Architecture

- **`RoleManager.sol`**: Implements Role-Based Access Control (RBAC) and the on-chain Know Your Business (KYB) identity registry.
- **`AssetRegistry.sol`**: The core ERC-721 implementation handling token minting and IPFS metadata URI binding.
- **`ProvenanceManager.sol`**: An append-only cryptographic ledger dedicated to recording lifecycle events (e.g., maintenance, stolen status).
- **`OwnershipTransfer.sol`**: Governs the secure Two-Step Handshake mechanism for trustless secondary market transfers.

## 🛠 Usage & Commands

### Setup
Install dependencies and build the smart contracts:
```shell
$ forge install
$ forge build
```

### Testing & Gas Profiling
Run the test suite to validate the asset lifecycle and security edge-cases:
```shell
$ forge test
```
To generate a gas snapshot of the core operations:
```shell
$ forge snapshot
```

### Local Simulation (Anvil)
Start a local Ethereum node for zero-cost testing and rapid iteration:
```shell
$ anvil
```

### Deployment
Create a `.env` file in this directory containing your private keys and RPC URLs (e.g., Alchemy). Then run the deployment script:

**Local Deployment:**
```shell
$ forge script script/DeployAptus.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
```

**Sepolia Testnet Deployment:**
```shell
$ forge script script/DeployAptus.s.sol --rpc-url sepolia --private-key $PRIVATE_KEY --broadcast --verify -vvvv
```