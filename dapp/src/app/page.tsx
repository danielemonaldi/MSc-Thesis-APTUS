'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { keccak256, toHex } from 'viem';
import assetRegistryJson from '../abi/AssetRegistry.json';
import { ASSET_REGISTRY_ADDRESS } from '../contracts';

export default function Home() {
  // Fetch the currently connected wallet address
  const { address } = useAccount();
  
  // Local state for form inputs and UI feedback
  const [serial, setSerial] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  // Wagmi hook to execute smart contract write operations
  const { data: txHash, writeContractAsync, isPending } = useWriteContract();

  // Wagmi hook to wait for the transaction to be mined and confirmed on-chain
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ 
    hash: txHash 
  });

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('1/3 ⏳ Uploading metadata to IPFS (Pinata)...');

    try {
      // 1. Construct the metadata object standard for the Digital Passport
      const metadata = {
        name: `${brand} ${model} - SN: ${serial}`,
        description: `Official Digital Passport for ${brand} ${model}.`,
        attributes: [
          { trait_type: "Brand", value: brand },
          { trait_type: "Model", value: model },
          { trait_type: "Serial Number", value: serial }
        ]
      };

      // 2. Securely call the internal Next.js API to pin the metadata to IPFS
      const res = await fetch('/api/pinata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const tokenURI = `ipfs://${data.ipfsHash}`;
      setStatusMsg(`2/3 ✅ IPFS upload confirmed! Preparing MetaMask transaction...`);

      // 3. Compute the cryptographic hash of the asset (serial number) for on-chain verification
      const assetHash = keccak256(toHex(serial));

      // 4. Send the transaction to the Smart Contract to mint the NFT
      await writeContractAsync({
        address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
        abi: assetRegistryJson.abi,
        functionName: 'registerAsset',
        args: [
          address,            // to: The receiving wallet address (the issuer for now)
          BigInt(serial),     // tokenId: The serial number converted to BigInt format
          tokenURI,           // tokenUri: The IPFS URI containing the metadata
          assetHash           // assetHash: The Keccak256 hash for security and integrity
        ],
      });

      setStatusMsg('3/3 ✍️ Please sign the transaction in MetaMask...');

    } catch (error: any) {
      console.error(error);
      setStatusMsg(`❌ Error: ${error.message || 'Something went wrong during the process'}`);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>APTUS Issuer Panel</h1>
        <ConnectButton />
      </header>

      <main>
        <div style={{ padding: '1.5rem', backgroundColor: '#f9f9f9', borderRadius: '12px', border: '1px solid #ddd' }}>
          <h2>Register New Watch</h2>
          <p style={{ fontSize: '0.9rem', color: '#666', marginBottom: '1.5rem' }}>
            Fill in the details to generate the Digital Passport and register it on the Sepolia blockchain.
          </p>

          <form onSubmit={handleMint} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input 
              required placeholder="Brand (e.g. Rolex)" 
              value={brand} onChange={e => setBrand(e.target.value)}
              style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <input 
              required placeholder="Model (e.g. Submariner)" 
              value={model} onChange={e => setModel(e.target.value)}
              style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            <input 
              required placeholder="Serial Number / NFC ID" 
              value={serial} onChange={e => setSerial(e.target.value)}
              style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #ccc' }}
            />
            
            <button 
              type="submit" 
              disabled={isPending || isConfirming}
              style={{ 
                padding: '1rem', 
                backgroundColor: isPending || isConfirming ? '#999' : '#0070f3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '6px', 
                cursor: 'pointer',
                fontWeight: 'bold'
              }}>
              {isPending || isConfirming ? 'Processing...' : 'Issue Digital Passport'}
            </button>
          </form>

          {/* Status Feedback Section */}
          <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
            <p>{statusMsg}</p>
            {isConfirming && <p style={{ color: 'orange' }}>⏳ Waiting for block confirmation on Sepolia...</p>}
            {isConfirmed && (
              <div style={{ color: 'green', marginTop: '1rem' }}>
                <p>🎉 <strong>Success!</strong> Asset successfully registered.</p>
                <a 
                  href={`https://sepolia.etherscan.io/tx/${txHash}`} 
                  target="_blank" 
                  style={{ color: '#0070f3', textDecoration: 'underline' }}>
                  View transaction on Etherscan
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}