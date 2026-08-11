'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { keccak256, stringToHex } from 'viem';
import assetRegistryJson from '../abi/AssetRegistry.json';
import { ASSET_REGISTRY_ADDRESS } from '../contracts';

export default function IssuerDashboard({ address }: { address: string | undefined }) {
  const publicClient = usePublicClient();
  
  const [serial, setSerial] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  const { data: txHash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return alert("Please select an image for the digital twin.");
    if (!publicClient) return alert("Blockchain client not initialized.");

    try {
      setStatusMsg('1/5 🔍 Scanning blockchain for next available ID...');
      let nextTokenId = 1;
      
      while (true) {
        try {
          await publicClient.readContract({
            address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
            abi: assetRegistryJson.abi,
            functionName: 'ownerOf',
            args: [BigInt(nextTokenId)]
          });
          nextTokenId++;
        } catch (error) {
          break;
        }
      }

      setStatusMsg('2/5 ⏳ Uploading image to IPFS via server...');
      const formData = new FormData();
      formData.append('file', imageFile);

      const imgRes = await fetch('/api/pinata', {
        method: 'POST',
        body: formData,
      });
      
      const imgData = await imgRes.json();
      if (!imgRes.ok) throw new Error(imgData.error || 'Failed to upload image');
      const imageURI = `ipfs://${imgData.ipfsHash}`;

      setStatusMsg('3/5 ⏳ Uploading metadata to IPFS via server...');
      const metadata = { 
        name: `${brand} ${model} - SN: ${serial}`, 
        description: `Official Digital Passport for ${brand} ${model}.`, 
        image: imageURI, 
        attributes: [
          { trait_type: "Brand", value: brand }, 
          { trait_type: "Model", value: model }, 
          { trait_type: "Physical Serial", value: serial }
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

      setStatusMsg(`4/5 ✅ IPFS confirmed! Preparing MetaMask transaction...`);
      const assetHash = keccak256(stringToHex(serial));
      
      await writeContractAsync({ 
        address: ASSET_REGISTRY_ADDRESS as `0x${string}`, 
        abi: assetRegistryJson.abi, 
        functionName: 'registerAsset', 
        args: [address, BigInt(nextTokenId), tokenURI, assetHash] 
      });
      
      setStatusMsg('5/5 ✍️ Please sign the transaction in MetaMask...');
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
        <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl p-6 text-center">
          <input 
            type="file" 
            accept="image/*" 
            required
            onChange={(e) => setImageFile(e.target.files ? e.target.files[0] : null)}
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 transition-colors cursor-pointer"
          />
          <p className="text-xs text-slate-400 mt-2">Upload the main asset image. This will be stored immutably on IPFS.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Brand</label>
            <input required placeholder="e.g. Rolex" value={brand} onChange={e => setBrand(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Model</label>
            <input required placeholder="e.g. Submariner" value={model} onChange={e => setModel(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm" />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Physical Serial (Alphanumeric)</label>
          <input required type="text" placeholder="e.g. M1234AB" value={serial} onChange={e => setSerial(e.target.value.toUpperCase())} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm uppercase" />
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
            <a href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer" className="text-emerald-600 underline text-xs">View on Etherscan</a>
            </div>
        )}
      </div>
    </div>
  );
}