'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import assetRegistryJson from '../abi/AssetRegistry.json';
import { ASSET_REGISTRY_ADDRESS } from '../contracts';

interface WatchAsset {
  tokenId: number;
  metadata: any;
}

export default function DealerDashboard({ address }: { address: string | undefined }) {
  const publicClient = usePublicClient();
  
  // Inventory State
  const [inventory, setInventory] = useState<WatchAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modal & Transfer State
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [customerAddress, setCustomerAddress] = useState('');

  // Wagmi Transfer Hooks
  const { data: txHashTransfer, writeContractAsync: writeTransfer, isPending: isTransferPending } = useWriteContract();
  const { isLoading: isTransferConfirming, isSuccess: isTransferConfirmed } = useWaitForTransactionReceipt({ hash: txHashTransfer });

  // Function to scan the blockchain for tokens owned by the Dealer
  const loadInventory = async () => {
    if (!publicClient || !address) return;
    
    setIsLoading(true);
    const foundAssets: WatchAsset[] = [];

    // PoC Scanner: We assume token IDs start from 1 and scan sequentially.
    // The loop breaks automatically when it hits a non-existent token.
    for (let i = 1; i <= 50; i++) {
      try {
        const owner = await publicClient.readContract({
          address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
          abi: assetRegistryJson.abi,
          functionName: 'ownerOf',
          args: [BigInt(i)]
        });

        // If the dealer is the owner, fetch the IPFS metadata
        if ((owner as string).toLowerCase() === address.toLowerCase()) {
          const uri = await publicClient.readContract({
            address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
            abi: assetRegistryJson.abi,
            functionName: 'tokenURI',
            args: [BigInt(i)]
          });

          const gatewayUrl = (uri as string).replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
          const ipfsRes = await fetch(gatewayUrl);
          const metadata = await ipfsRes.json();

          foundAssets.push({ tokenId: i, metadata });
        }
      } catch (error) {
        // If ownerOf fails, it means the token ID does not exist yet. We can stop scanning.
        break;
      }
    }
    
    setInventory(foundAssets);
    setIsLoading(false);
  };

  // Load inventory on component mount or when address changes
  useEffect(() => {
    loadInventory();
  }, [address, publicClient, isTransferConfirmed]); // Re-fetch when a transfer is confirmed

  const handleRetailSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedToken === null) return;
    
    try {
      await writeTransfer({
        address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
        abi: assetRegistryJson.abi,
        functionName: 'safeTransferFrom',
        args: [address, customerAddress, BigInt(selectedToken)],
      });
    } catch (error: any) {
      console.error(error);
      alert(`Transfer failed: ${error.message || 'An error occurred'}`);
    }
  };

  const closeModal = () => {
    setSelectedToken(null);
    setCustomerAddress('');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-5xl mx-auto relative">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-light text-slate-900 mb-1">Dealer Boutique</h2>
          <p className="text-slate-500 font-light text-sm">Authorized Retail Vault</p>
        </div>
        <div className="text-left md:text-right mt-4 md:mt-0">
          <p className="text-xs text-slate-400">Store Wallet</p>
          <p className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 mt-1">{address}</p>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm font-light">Scanning blockchain vault...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && inventory.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <span className="text-4xl mb-4 block">📦</span>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Your vault is empty</h3>
          <p className="text-sm text-slate-500">No watches are currently assigned to this boutique.</p>
        </div>
      )}

      {/* Inventory Grid */}
      {!isLoading && inventory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventory.map((asset) => (
            <div key={asset.tokenId} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              
              {/* Card Image */}
              <div className="bg-slate-50 h-48 flex items-center justify-center border-b border-slate-100 overflow-hidden">
                {asset.metadata.image ? (
                  <img 
                    src={asset.metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/')} 
                    alt={asset.metadata.name} 
                    className="w-[99%] h-[99%] object-contain"
                  />
                ) : (
                  <span className="text-5xl">⌚</span>
                )}
              </div>
              
              {/* Card Body */}
              <div className="p-5 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-medium text-slate-900">{asset.metadata.name || 'Unknown Watch'}</h3>
                  <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded">
                    #{asset.tokenId}
                  </span>
                </div>
                
                <div className="space-y-1 mb-6 text-sm text-slate-500 flex-1">
                  {asset.metadata.attributes?.slice(0, 3).map((attr: any, idx: number) => (
                    <div key={idx} className="flex justify-between">
                      <span className="text-slate-400 text-xs">{attr.trait_type}</span>
                      <span className="font-medium text-slate-700 text-xs">{attr.value}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setSelectedToken(asset.tokenId)}
                  className="w-full py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm"
                >
                  Transfer to Customer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Transfer Modal Overlay */}
      {selectedToken !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-slate-900">Retail Sale</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">
              Transferring digital passport for Watch <span className="font-bold text-slate-800">#{selectedToken}</span> to the final customer. This action is irreversible.
            </p>

            <form onSubmit={handleRetailSale} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Customer Wallet Address</label>
                <input 
                  required 
                  placeholder="0x..." 
                  value={customerAddress} 
                  onChange={e => setCustomerAddress(e.target.value)} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 text-sm" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isTransferPending || isTransferConfirming} 
                className="w-full py-3 mt-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 shadow-sm"
              >
                {isTransferPending || isTransferConfirming ? 'Processing Transaction...' : 'Confirm Transfer'}
              </button>
            </form>

            {isTransferConfirming && <p className="text-amber-600 text-sm mt-4 text-center font-medium">⏳ Waiting for confirmation on chain...</p>}
            
            {isTransferConfirmed && (
              <div className="text-emerald-700 mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-col items-center text-sm font-medium">
                <p className="mb-2">🤝 Sale successful!</p>
                <a href={`https://sepolia.etherscan.io/tx/${txHashTransfer}`} target="_blank" rel="noreferrer" className="text-emerald-600 underline text-xs">View Receipt</a>
                <button onClick={closeModal} className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded text-xs">Close</button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}