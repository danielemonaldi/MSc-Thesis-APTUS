'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import assetRegistryJson from '../abi/AssetRegistry.json';
import provenanceManagerJson from '../abi/ProvenanceManager.json';
import { ASSET_REGISTRY_ADDRESS, PROVENANCE_MANAGER_ADDRESS } from '../contracts';

interface WatchAsset {
  tokenId: number;
  serial: string;
  name: string;
  image: string;
  metadata: any;
}

/**
 * @title ServiceDashboard
 * @dev Service center dashboard featuring serial number search, clean asset naming, and correct image rendering.
 */
export default function ServiceDashboard({ address }: { address: string | undefined }) {
  const publicClient = usePublicClient();
  
  const [searchSerial, setSearchSerial] = useState('');
  const [assetData, setAssetData] = useState<WatchAsset | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [description, setDescription] = useState('');

  const { data: txHashLog, writeContractAsync: writeLog, isPending: isLogPending } = useWriteContract();
  const { isLoading: isLogConfirming, isSuccess: isLogConfirmed } = useWaitForTransactionReceipt({ hash: txHashLog });

  // Search blockchain assets by matching physical serial number across token IDs
  const handleSearchAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicClient || !searchSerial) return;

    setIsSearching(true);
    setSearchStatus('Scanning blockchain records for serial number...');
    setAssetData(null);

    try {
      let foundTokenId: number | null = null;
      let foundMetadata: any = null;

      for (let i = 1; i <= 50; i++) {
        try {
          await publicClient.readContract({
            address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
            abi: assetRegistryJson.abi,
            functionName: 'ownerOf',
            args: [BigInt(i)]
          });

          const uri = await publicClient.readContract({
            address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
            abi: assetRegistryJson.abi,
            functionName: 'tokenURI',
            args: [BigInt(i)]
          });

          const gatewayUrl = (uri as string).replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          const res = await fetch(gatewayUrl);
          const metadata = await res.json();
          const physicalSerial = metadata.attributes?.find((attr: any) => attr.trait_type === 'Physical Serial')?.value || '';

          if (physicalSerial.toLowerCase() === searchSerial.trim().toLowerCase()) {
            foundTokenId = i;
            foundMetadata = metadata;
            break;
          }
        } catch (err) {
          // Skip missing tokens
        }
      }

      if (foundTokenId !== null && foundMetadata) {
        // Clean up the display name to remove trailing serial strings if present
        let cleanName = foundMetadata.name || 'Watch Asset';
        if (cleanName.includes(' - SN:')) {
          cleanName = cleanName.split(' - SN:')[0];
        }

        // Robustly format IPFS gateway URL for image rendering
        let imageGateway = '';
        if (foundMetadata.image) {
          if (foundMetadata.image.startsWith('ipfs://')) {
            imageGateway = foundMetadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          } else if (foundMetadata.image.startsWith('http')) {
            imageGateway = foundMetadata.image;
          } else {
            imageGateway = `https://gateway.pinata.cloud/ipfs/${foundMetadata.image}`;
          }
        }

        setAssetData({ 
          tokenId: foundTokenId, 
          serial: searchSerial.trim().toUpperCase(), 
          name: cleanName,
          image: imageGateway,
          metadata: foundMetadata 
        });
        setSearchStatus('');
      } else {
        setSearchStatus('❌ Error: Watch with this serial number was not found.');
      }
    } catch (error) {
      console.error(error);
      setSearchStatus('❌ Error scanning records.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetData) return;

    try {
      await writeLog({
        address: PROVENANCE_MANAGER_ADDRESS as `0x${string}`,
        abi: provenanceManagerJson.abi,
        functionName: 'logMaintenance',
        args: [BigInt(assetData.tokenId), description],
      });
    } catch (error: any) {
      console.error(error);
      alert(`Transaction failed: ${error.message || 'An error occurred'}`);
    }
  };

  const resetLogForm = () => {
    setDescription('');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-5xl mx-auto relative">
      
      {/* Clean Header */}
      <div className="mb-8 pb-6 border-b border-slate-100">
        <h2 className="text-2xl font-light text-slate-900 mb-1">Service Center</h2>
        <p className="text-slate-500 font-light text-sm">Search asset by serial number for maintenance updates and provenance logging.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Serial Scanner */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-medium text-slate-800 mb-1">Asset Serial Scanner</h3>
          <p className="text-xs text-slate-500 mb-6">Enter physical serial number to inspect the digital passport.</p>
          
          <form onSubmit={handleSearchAsset} className="space-y-4">
            <div>
              <input 
                required 
                type="text" 
                placeholder="e.g. M1234AB" 
                value={searchSerial} 
                onChange={e => {
                  setSearchSerial(e.target.value.toUpperCase());
                  resetLogForm();
                }} 
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm font-mono uppercase" 
              />
            </div>
            <button 
              type="submit" 
              disabled={isSearching}
              className="w-full py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
            >
              {isSearching ? 'Scanning Records...' : 'Verify Serial Number'}
            </button>
          </form>

          {searchStatus && <p className="text-sm mt-4 font-medium text-slate-600">{searchStatus}</p>}

          {assetData && (
            <div className="mt-6 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm animate-fade-in">
              <div className="bg-slate-50 h-52 w-full flex items-center justify-center border-b border-slate-100 overflow-hidden relative p-4">
                {assetData.image ? (
                  <img src={assetData.image} alt={assetData.name} className="max-h-full max-w-full object-contain drop-shadow-sm" />
                ) : (
                  <span className="text-5xl">⌚</span>
                )}
                <div className="absolute top-2 right-2">
                  <span className="bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                    ID: #{assetData.tokenId}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h4 className="text-lg font-medium text-slate-900 mb-1">{assetData.name}</h4>
                <div className="mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Physical Serial</span>
                  <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded inline-block">
                    {assetData.serial}
                  </span>
                </div>
                <div className="space-y-1 text-sm text-slate-500">
                  {assetData.metadata.attributes?.filter((attr: any) => attr.trait_type !== 'Physical Serial').slice(0, 2).map((attr: any, idx: number) => (
                    <div key={idx} className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-400 text-xs">{attr.trait_type}</span>
                      <span className="font-medium text-slate-700 text-xs">{attr.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Maintenance Logger */}
        <div className={`p-6 rounded-xl border transition-all ${assetData ? 'bg-slate-50 border-slate-300' : 'bg-slate-50/50 border-slate-200 opacity-50 grayscale pointer-events-none'}`}>
          <h3 className="text-lg font-medium text-slate-800 mb-1">Provenance Update</h3>
          <p className="text-xs text-slate-500 mb-6">Log maintenance details into the immutable blockchain ledger.</p>
          
          <form onSubmit={handleLogMaintenance} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Service Description</label>
              <textarea 
                required 
                rows={4}
                placeholder="e.g. Complete movement service, dial replacement, and case polishing."
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm resize-none" 
              />
            </div>
            
            <button 
              type="submit" 
              disabled={isLogPending || isLogConfirming || !assetData} 
              className="w-full py-4 mt-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium text-sm disabled:opacity-50 shadow-sm"
            >
              {isLogPending || isLogConfirming ? 'Writing to Ledger...' : 'Record Maintenance'}
            </button>
          </form>

          {isLogConfirming && <p className="text-amber-600 text-sm mt-4 font-medium text-center">⏳ Waiting for block confirmation...</p>}
          
          {isLogConfirmed && (
            <div className="text-emerald-700 mt-4 p-4 bg-white rounded-lg border border-emerald-200 flex flex-col items-center text-sm font-medium animate-fade-in">
              <p className="mb-2">✅ Service logged successfully!</p>
              <a href={`https://sepolia.etherscan.io/tx/${txHashLog}`} target="_blank" rel="noreferrer" className="text-emerald-600 underline text-xs">View Receipt on Etherscan</a>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}