'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { isAddress } from 'viem';
import assetRegistryJson from '../abi/AssetRegistry.json';
import { ASSET_REGISTRY_ADDRESS } from '../contracts';

interface OwnedAsset {
  tokenId: number;
  serial: string;
  name: string;
  image: string;
}

export default function IssuerDistributionDashboard({ address }: { address: string | undefined }) {
  const publicClient = usePublicClient();

  const [myAssets, setMyAssets] = useState<OwnedAsset[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedTokenId, setSelectedTokenId] = useState<number | null>(null);
  const [dealerAddress, setDealerAddress] = useState('');
  const [transferStatusMsg, setTransferStatusMsg] = useState('');

  const { data: txHashTransfer, writeContractAsync: writeTransfer, isPending: isTransferPending } = useWriteContract();
  const { isLoading: isTransferConfirming, isSuccess: isTransferConfirmed } = useWaitForTransactionReceipt({ hash: txHashTransfer });

  const loadIssuerInventory = async () => {
    if (!publicClient || !address) return;

    setIsScanning(true);
    const assets: OwnedAsset[] = [];

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
          const res = await fetch(gatewayUrl);
          const metadata = await res.json();

          const physicalSerial = metadata.attributes?.find((attr: any) => attr.trait_type === 'Physical Serial')?.value || `SN-${i}`;

          assets.push({
            tokenId: i,
            serial: physicalSerial,
            name: metadata.name || 'Watch Asset',
            image: metadata.image ? metadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') : ''
          });
        }
      } catch (error) {
        break;
      }
    }

    setMyAssets(assets);
    setIsScanning(false);
  };

  useEffect(() => {
    loadIssuerInventory();
  }, [address, publicClient, isTransferConfirmed]);

  const handleTransferToDealer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTokenId === null) return alert("Please select a watch by its serial number.");
    if (!isAddress(dealerAddress)) return alert("Invalid Dealer Ethereum Address");

    try {
      setTransferStatusMsg('⏳ Preparing transfer transaction...');
      await writeTransfer({
        address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
        abi: assetRegistryJson.abi,
        functionName: 'safeTransferFrom',
        args: [address, dealerAddress, BigInt(selectedTokenId)],
      });
      setTransferStatusMsg('✍️ Please sign the transfer in MetaMask...');
    } catch (error: any) {
      console.error(error);
      setTransferStatusMsg(`❌ Error: ${error.message || 'Transfer failed'}`);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-3xl mx-auto">
      <h3 className="text-2xl font-light text-slate-900 mb-1">B2B Distribution Panel</h3>
      <p className="text-slate-500 mb-6 font-light text-sm">Select a minted watch from your vault by its serial number to distribute it to an authorized dealer.</p>

      {isScanning && (
        <div className="text-center py-12">
          <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-slate-400 text-xs">Scanning vault inventory...</p>
        </div>
      )}

      {!isScanning && myAssets.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-400 text-sm">No assets available in your vault to distribute.</p>
        </div>
      )}

      {!isScanning && myAssets.length > 0 && (
        <form onSubmit={handleTransferToDealer} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Select Asset by Serial Number</label>
            <select 
              required
              value={selectedTokenId || ''}
              onChange={e => setSelectedTokenId(Number(e.target.value))}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
            >
              <option value="">-- Choose Watch Serial --</option>
              {myAssets.map((asset) => (
                <option key={asset.tokenId} value={asset.tokenId}>
                  SN: {asset.serial} — {asset.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Dealer Wallet Address</label>
            <input 
              required 
              placeholder="0x..." 
              value={dealerAddress} 
              onChange={e => setDealerAddress(e.target.value)} 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm" 
            />
          </div>

          <button 
            type="submit" 
            disabled={isTransferPending || isTransferConfirming} 
            className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium text-sm disabled:opacity-50 shadow-sm"
          >
            {isTransferPending || isTransferConfirming ? 'Processing Transfer...' : 'Transfer to Dealer Vault'}
          </button>
        </form>
      )}

      <div className="mt-4 text-sm font-medium">
        {transferStatusMsg && <p className="text-slate-600 p-4 bg-slate-50 rounded-lg border border-slate-200">{transferStatusMsg}</p>}
        {isTransferConfirmed && (
          <div className="text-blue-700 mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 flex flex-col items-center">
            <p className="mb-2">🤝 Asset successfully transferred to the dealer!</p>
            <a href={`https://sepolia.etherscan.io/tx/${txHashTransfer}`} target="_blank" rel="noreferrer" className="text-blue-600 underline text-xs">View on Etherscan</a>
          </div>
        )}
      </div>
    </div>
  );
}