'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { keccak256, toHex } from 'viem';

import assetRegistryJson from '../abi/AssetRegistry.json';
import { ASSET_REGISTRY_ADDRESS } from '../contracts';

export default function IssuerDashboard({ address }: { address: string | undefined }) {
  const [serial, setSerial] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  const { data: txHash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg('1/3 ⏳ Uploading metadata to IPFS...');

    try {
      const metadata = {
        name: `${brand} ${model} - SN: ${serial}`,
        description: `Official Digital Passport for ${brand} ${model}.`,
        attributes: [
          { trait_type: "Brand", value: brand },
          { trait_type: "Model", value: model },
          { trait_type: "Serial Number", value: serial }
        ]
      };

      const res = await fetch('/api/pinata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metadata)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      const tokenURI = `ipfs://${data.ipfsHash}`;
      setStatusMsg(`2/3 ✅ IPFS confirmed! Preparing MetaMask transaction...`);

      const assetHash = keccak256(toHex(serial));

      await writeContractAsync({
        address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
        abi: assetRegistryJson.abi,
        functionName: 'registerAsset',
        args: [address, BigInt(serial), tokenURI, assetHash],
      });

      setStatusMsg('3/3 ✍️ Please sign the transaction in MetaMask...');
    } catch (error: any) {
      console.error(error);
      setStatusMsg(`❌ Error: ${error.message || 'An error occurred'}`);
    }
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f1f5f9', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
      <h2 style={{ color: '#0f172a' }}>Issuer Dashboard</h2>
      <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>Authorized access granted for manufacturing.</p>
      
      <form onSubmit={handleMint} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', backgroundColor: 'white', padding: '2rem', borderRadius: '8px' }}>
        <input required placeholder="Brand (e.g. Rolex)" value={brand} onChange={e => setBrand(e.target.value)} style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        <input required placeholder="Model (e.g. Submariner)" value={model} onChange={e => setModel(e.target.value)} style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        <input required placeholder="Serial Number (numeric)" type="number" value={serial} onChange={e => setSerial(e.target.value)} style={{ padding: '0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }} />
        
        <button type="submit" disabled={isPending || isConfirming} style={{ padding: '1rem', backgroundColor: isPending || isConfirming ? '#94a3b8' : '#0f172a', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '1rem' }}>
          {isPending || isConfirming ? 'Processing...' : 'Issue Digital Passport'}
        </button>
      </form>

      <div style={{ marginTop: '1.5rem', fontSize: '0.9rem', fontWeight: 'bold' }}>
        <p>{statusMsg}</p>
        {isConfirming ? <p style={{ color: '#d97706' }}>⏳ Waiting for block confirmation...</p> : null}
        {isConfirmed ? (
          <div style={{ color: '#15803d', marginTop: '1rem', padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '6px' }}>
            <p>🎉 Asset successfully minted!</p>
            <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" style={{ color: '#15803d', textDecoration: 'underline' }}>View on Etherscan</a>
          </div>
        ) : null}
      </div>
    </div>
  );
}