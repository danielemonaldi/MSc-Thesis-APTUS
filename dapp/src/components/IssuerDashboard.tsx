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
      const metadata = { name: `${brand} ${model} - SN: ${serial}`, description: `Official Digital Passport for ${brand} ${model}.`, attributes: [{ trait_type: "Brand", value: brand }, { trait_type: "Model", value: model }, { trait_type: "Serial Number", value: serial }] };
      const res = await fetch('/api/pinata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(metadata) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const tokenURI = `ipfs://${data.ipfsHash}`;
      setStatusMsg(`2/3 ✅ IPFS confirmed! Preparing MetaMask transaction...`);
      const assetHash = keccak256(toHex(serial));
      await writeContractAsync({ address: ASSET_REGISTRY_ADDRESS as `0x${string}`, abi: assetRegistryJson.abi, functionName: 'registerAsset', args: [address, BigInt(serial), tokenURI, assetHash] });
      setStatusMsg('3/3 ✍️ Please sign the transaction in MetaMask...');
    } catch (error: any) {
      console.error(error);
      setStatusMsg(`❌ Error: ${error.message || 'An error occurred'}`);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-light text-slate-900 mb-1">Issuer Dashboard</h2>
      <p className="text-slate-500 mb-8 font-light text-sm">Authorized manufacturing access.</p>
      
      <form onSubmit={handleMint} className="space-y-5">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Brand</label>
          <input required placeholder="e.g. Rolex" value={brand} onChange={e => setBrand(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Model</label>
          <input required placeholder="e.g. Submariner" value={model} onChange={e => setModel(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Serial Number</label>
          <input required type="number" placeholder="Numeric ID" value={serial} onChange={e => setSerial(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm" />
        </div>
        
        <button type="submit" disabled={isPending || isConfirming} className="w-full py-4 mt-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed">
          {isPending || isConfirming ? 'Processing Passport...' : 'Issue Digital Passport'}
        </button>
      </form>

      <div className="mt-6 text-sm font-medium">
        {statusMsg && <p className="text-slate-600 p-4 bg-slate-50 rounded-lg border border-slate-200">{statusMsg}</p>}
        {isConfirmed && (
          <div className="text-emerald-700 mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-col items-center">
            <p className="mb-2">🎉 Asset successfully minted!</p>
            <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" className="text-emerald-600 underline text-xs">View on Etherscan</a>
          </div>
        )}
      </div>
    </div>
  );
}