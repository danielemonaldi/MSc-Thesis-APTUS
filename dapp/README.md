# APTUS Decentralized Application (dApp)

This is the front-end application for the **APTUS Framework**, providing tailored workflows for manufacturers, authorized dealers, service centers, and private collectors. 

It is built on a modern Web3 stack featuring [Next.js](https://nextjs.org/), [Tailwind CSS](https://tailwindcss.com/), [Wagmi](https://wagmi.sh), and [RainbowKit](https://rainbowkit.com).

## 🌟 Core Modules

- **Dynamic Identity Routing:** The UI adapts based on the active KYB roles held by the connected wallet.
- **Pinata IPFS Integration:** Server-side API routes securely handle image and JSON metadata uploads to decentralized storage.
- **P2P Transfer Center:** A dedicated vault interface allowing users to securely execute the Two-Step Handshake.
- **Public Explorer:** A transparency dashboard to verify chronological provenance timelines and theft warnings.

## 🚀 Getting Started

### 1. Environment Configuration
Create a `.env.local` file in the root of this directory. You must supply your Pinata credentials for IPFS storage and the public addresses of your deployed smart contracts:

```env
# Pinata IPFS Integration (Server-Side)
PINATA_JWT=your_pinata_jwt_token_here
NEXT_PUBLIC_GATEWAY_URL=your_pinata_gateway_url

# Smart Contract Addresses (Sepolia or Localhost)
NEXT_PUBLIC_ROLE_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_ASSET_REGISTRY_ADDRESS=0x...
NEXT_PUBLIC_PROVENANCE_MANAGER_ADDRESS=0x...
NEXT_PUBLIC_OWNERSHIP_TRANSFER_ADDRESS=0x...
```

### 2. Run the Development Server
Install the required packages and start the application:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to interact with the application.

## 📚 Learn More
- [RainbowKit Documentation](https://rainbowkit.com) - Wallet connection flow.
- [wagmi Documentation](https://wagmi.sh) - React Hooks for Ethereum.
- [Pinata API Documentation](https://docs.pinata.cloud/) - IPFS pinning services.