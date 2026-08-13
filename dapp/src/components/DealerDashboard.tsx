'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { isAddress } from 'viem';
import assetRegistryJson from '../abi/AssetRegistry.json';
import { ASSET_REGISTRY_ADDRESS } from '../contracts';

interface WatchAsset {
  tokenId: number;
  serial: string;
  name: string;
  image: string;
  metadata: any;
}

/**
 * @title DealerDashboard
 * @dev Retail boutique dashboard featuring serial number search, clean asset naming, and correctly rendered images.
 */
export default function DealerDashboard({ address }: { address: string | undefined }) {
  const publicClient = usePublicClient();
  
  const [inventory, setInventory] = useState<WatchAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchSerial, setSearchSerial] = useState('');
  
  // Retail Sale Modal State
  const [selectedAsset, setSelectedAsset] = useState<WatchAsset | null>(null);
  const [customerAddress, setCustomerAddress] = useState('');
  const [transferStatusMsg, setTransferStatusMsg] = useState('');

  const { data: txHashTransfer, writeContractAsync: writeTransfer, isPending: isTransferPending } = useWriteContract();
  const { isLoading: isTransferConfirming, isSuccess: isTransferConfirmed } = useWaitForTransactionReceipt({ hash: txHashTransfer });

  // Load boutique inventory from the blockchain
  const loadInventory = async () => {
    if (!publicClient || !address) return;
    
    setIsLoading(true);
    const foundAssets: WatchAsset[] = [];

    for (let i = 1; i <= 50; i++) {
      try {
        const owner = await publicClient.readContract({
          address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
          abi: assetRegistryJson.abi,
          functionName: 'ownerOf',
          args: [BigInt(i)]
        });

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
          
          // Extract physical serial number from attributes or fallback
          const physicalSerial = metadata.attributes?.find((attr: any) => attr.trait_type === 'Physical Serial')?.value || `SN-${i}`;

          // Clean up the display name to remove any trailing serial numbers
          let cleanName = metadata.name || 'Watch Asset';
          if (cleanName.includes(' - SN:')) {
            cleanName = cleanName.split(' - SN:')[0];
          }

          // Robustly format IPFS gateway URL for the image rendering
          let imageGateway = '';
          if (metadata.image) {
            if (metadata.image.startsWith('ipfs://')) {
              imageGateway = metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
            } else if (metadata.image.startsWith('http')) {
              imageGateway = metadata.image;
            } else {
              imageGateway = `https://gateway.pinata.cloud/ipfs/${metadata.image}`;
            }
          }

          foundAssets.push({ 
            tokenId: i, 
            serial: physicalSerial, 
            name: cleanName,
            image: imageGateway,
            metadata 
          });
        }
      } catch (error) {
        break;
      }
    }
    
    setInventory(foundAssets);
    setIsLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, [address, publicClient, isTransferConfirmed]);

  // Filter inventory based on the serial number search input
  const filteredInventory = inventory.filter(asset => 
    asset.serial.toLowerCase().includes(searchSerial.trim().toLowerCase())
  );

  // Handle retail sale execution (transfer to customer)
  const handleRetailSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAsset) return;
    if (!isAddress(customerAddress)) return alert("Invalid Customer Ethereum Address");
    
    try {
      setTransferStatusMsg('⏳ Preparing retail sale transaction...');
      await writeTransfer({
        address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
        abi: assetRegistryJson.abi,
        functionName: 'safeTransferFrom',
        args: [address, customerAddress, BigInt(selectedAsset.tokenId)],
      });
      setTransferStatusMsg('✍️ Please sign the transfer in MetaMask...');
    } catch (error: any) {
      console.error(error);
      setTransferStatusMsg(`❌ Error: ${error.message || 'An error occurred'}`);
    }
  };

  const closeModal = () => {
    setSelectedAsset(null);
    setCustomerAddress('');
    setTransferStatusMsg('');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-5xl mx-auto relative">
      
      {/* Header with Search Bar */}
      <div className="mb-8 pb-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-light text-slate-900 mb-1">Dealer Boutique</h2>
          <p className="text-slate-500 font-light text-sm">Manage boutique inventory and execute retail sales.</p>
        </div>
        
        {/* Serial Number Search Bar */}
        <div className="w-full md:w-72 mt-4 md:mt-0">
          <input 
            type="text"
            placeholder="🔍 Search by serial number..."
            value={searchSerial}
            onChange={e => setSearchSerial(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm uppercase font-mono"
          />
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm font-light">Scanning blockchain vault...</p>
        </div>
      )}

      {!isLoading && inventory.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <span className="text-4xl mb-4 block">📦</span>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Your vault is empty</h3>
          <p className="text-sm text-slate-500">No watches are currently assigned to this boutique.</p>
        </div>
      )}

      {/* Symmetric Wallet Grid */}
      {!isLoading && inventory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInventory.map((asset) => (
            <div key={asset.tokenId} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              
              {/* Image Container with robust rendering */}
              <div className="bg-slate-50 h-52 w-full flex items-center justify-center border-b border-slate-100 overflow-hidden relative p-4">
                {asset.image ? (
                  <img src={asset.image} alt={asset.name} className="max-h-full max-w-full object-contain drop-shadow-sm" />
                ) : (
                  <span className="text-5xl">⌚</span>
                )}
                <span className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-1 rounded">
                  #{asset.tokenId}
                </span>
              </div>
              
              {/* Card Content */}
              <div className="p-5 flex-1 flex flex-col">
                <h3 className="text-lg font-medium text-slate-900 mb-1">{asset.name}</h3>
                
                <div className="mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Physical Serial</span>
                  <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded inline-block">
                    {asset.serial}
                  </span>
                </div>

                <button 
                  onClick={() => setSelectedAsset(asset)}
                  className="w-full mt-auto py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-xs shadow-sm"
                >
                  Transfer to Customer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Retail Sale Modal */}
      {selectedAsset !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-slate-900">Retail Sale</h3>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            
            <p className="text-sm text-slate-500 mb-2">
              Transferring digital passport for <span className="font-bold text-slate-800">{selectedAsset.name}</span> to the final customer.
            </p>
            <p className="text-xs font-mono bg-slate-50 border border-slate-200 p-2 rounded text-slate-600 mb-6">
              Serial: {selectedAsset.serial} (ID: #{selectedAsset.tokenId})
            </p>

            <form onSubmit={handleRetailSale} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Customer Wallet Address</label>
                <input 
                  required 
                  placeholder="0x..." 
                  value={customerAddress} 
                  onChange={e => setCustomerAddress(e.target.value)} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm font-mono" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isTransferPending || isTransferConfirming} 
                className="w-full py-3 mt-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium text-sm disabled:opacity-50 shadow-sm"
              >
                {isTransferPending || isTransferConfirming ? 'Processing Sale...' : 'Confirm Retail Transfer'}
              </button>
            </form>

            {transferStatusMsg && <p className="text-slate-600 p-4 bg-slate-50 rounded-lg border border-slate-200 mt-4 text-sm">{transferStatusMsg}</p>}
            
            {isTransferConfirmed && (
              <div className="text-emerald-700 mt-4 p-4 bg-emerald-50 rounded-lg border border-emerald-200 flex flex-col items-center text-sm font-medium">
                <p className="mb-2">🤝 Sale successful!</p>
                <a href={`https://sepolia.etherscan.io/tx/${txHashTransfer}`} target="_blank" rel="noreferrer" className="text-emerald-600 underline text-xs">View Receipt</a>
                <button onClick={closeModal} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded text-xs">Close</button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}