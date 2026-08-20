'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, usePublicClient } from 'wagmi';
import { isAddress } from 'viem';

import assetRegistryJson from '../abi/AssetRegistry.json';
import ownershipTransferJson from '../abi/OwnershipTransfer.json';
import provenanceManagerJson from '../abi/ProvenanceManager.json';
import roleManagerJson from '../abi/RoleManager.json';

import { 
  ASSET_REGISTRY_ADDRESS, 
  OWNERSHIP_TRANSFER_ADDRESS, 
  PROVENANCE_MANAGER_ADDRESS,
  ROLE_MANAGER_ADDRESS
} from '../contracts';

interface WatchAsset {
  tokenId: number;
  serial: string;
  name: string;
  image: string;
  metadata: any;
}

interface ProvenanceEvent {
  timestamp: bigint;
  eventType: string;
  description: string;
  actor: string;
  actorName?: string;
  subType?: string;
}

/**
 * @title CustomerDashboard
 * @dev Private collector vault featuring serial search, unified view (no tabs), and direct transfer actions.
 */
export default function CustomerDashboard({ address }: { address: string | undefined }) {
  const publicClient = usePublicClient();
  
  // Vault State & Search
  const [inventory, setInventory] = useState<WatchAsset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchSerial, setSearchSerial] = useState('');

  // Transfer State (P2P Handshakes)
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [initiateStatus, setInitiateStatus] = useState('');
  const [acceptTokenId, setAcceptTokenId] = useState('');
  const [cancelTokenId, setCancelTokenId] = useState('');
  const [transferCenterStatus, setTransferCenterStatus] = useState('');

  // Provenance Timeline State
  const [historyTokenId, setHistoryTokenId] = useState<number | null>(null);
  const [assetHistory, setAssetHistory] = useState<ProvenanceEvent[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  // Stolen Report Confirmation State
  const [stolenToken, setStolenToken] = useState<number | null>(null);
  const [stolenSerial, setStolenSerial] = useState('');
  const [stolenConfirmationSerial, setStolenConfirmationSerial] = useState('');
  const [stolenStatus, setStolenStatus] = useState('');

  const { writeContractAsync } = useWriteContract();

  // Load Inventory for the connected customer wallet
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

          // Clean up the display name to remove trailing serial strings if present in metadata name
          let cleanName = metadata.name || 'Watch Asset';
          if (cleanName.includes(' - SN:')) {
            cleanName = cleanName.split(' - SN:')[0];
          }

          // Robustly format IPFS gateway URL for image rendering
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
  }, [address, publicClient]); 

  // Filter inventory based on the serial number search input
  const filteredInventory = inventory.filter(asset => 
    asset.serial.toLowerCase().includes(searchSerial.trim().toLowerCase())
  );

  // Fetch Provenance History with entity name resolution and B2B distinction
  const handleViewProvenance = async (tokenId: number) => {
    if (!publicClient) return;
    setHistoryTokenId(tokenId);
    setIsHistoryLoading(true);
    setAssetHistory([]);

    try {
      const history = await publicClient.readContract({
        address: PROVENANCE_MANAGER_ADDRESS as `0x${string}`,
        abi: provenanceManagerJson.abi,
        functionName: 'getAssetHistory',
        args: [BigInt(tokenId)]
      });

      const rawEvents = (history as any[]).map(evt => ({
        timestamp: evt.timestamp ?? evt[0] ?? BigInt(0),
        eventType: evt.eventType ?? evt[1] ?? 'UNKNOWN',
        description: evt.details ?? evt[2] ?? 'No description provided.',
        actor: evt.reporter ?? evt[3] ?? 'Unknown Actor'
      }));

      rawEvents.sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

      let transferCount = 0;
      const formattedHistory: ProvenanceEvent[] = [];

      for (const evt of rawEvents) {
        let subType = '';
        let displayEventType = evt.eventType;

        if (evt.eventType.toUpperCase() === 'TRANSFERRED') {
          transferCount++;
          if (transferCount === 1) {
            subType = 'B2B Distribution (Manufacturer to Authorized Dealer)';
          } else {
            subType = 'Retail / P2P Ownership Transfer';
          }
        }

        let actorName = 'Unknown Entity';
        try {
          const name = await publicClient.readContract({
            address: ROLE_MANAGER_ADDRESS as `0x${string}`,
            abi: roleManagerJson.abi,
            functionName: 'getEntityName',
            args: [evt.actor as `0x${string}`]
          });
          if (name && typeof name === 'string' && name !== '') {
            actorName = name;
          }
        } catch (e) {
          // Fallback if lookup fails
        }

        formattedHistory.push({
          ...evt,
          eventType: displayEventType,
          subType,
          actorName
        });
      }

      formattedHistory.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));
      setAssetHistory(formattedHistory);

    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const closeHistoryModal = () => {
    setHistoryTokenId(null);
    setAssetHistory([]);
  };

  const getEventBadgeStyle = (eventType: string, subType?: string) => {
    if (!eventType) return 'bg-slate-100 text-slate-800 border-slate-200';
    
    if (eventType.toUpperCase() === 'TRANSFERRED') {
      if (subType?.includes('B2B')) {
        return 'bg-amber-100 text-amber-800 border-amber-200';
      }
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }

    switch(eventType.toUpperCase()) {
      case 'CREATED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'MAINTENANCE': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'STOLEN': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  const formatDate = (unixTimestamp: bigint) => {
    const date = new Date(Number(unixTimestamp) * 1000);
    return date.toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', 
      hour: '2-digit', minute: '2-digit'
    });
  };

  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedToken === null || !publicClient) return;
    if (!isAddress(recipientAddress)) return alert("Invalid Ethereum Address");
    
    try {
      setInitiateStatus('1/2 ⏳ Approving secure transfer contract...');
      const hashApprove = await writeContractAsync({
        address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
        abi: assetRegistryJson.abi,
        functionName: 'approve',
        args: [OWNERSHIP_TRANSFER_ADDRESS, BigInt(selectedToken)],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashApprove });

      setInitiateStatus('2/2 ⏳ Initiating handshake with recipient...');
      const hashInitiate = await writeContractAsync({
        address: OWNERSHIP_TRANSFER_ADDRESS as `0x${string}`,
        abi: ownershipTransferJson.abi,
        functionName: 'initiateTransfer',
        args: [BigInt(selectedToken), recipientAddress],
      });
      await publicClient.waitForTransactionReceipt({ hash: hashInitiate });

      setInitiateStatus('✅ Handshake initiated! The recipient must now accept it.');
      setTimeout(() => {
        closeTransferModal();
        loadInventory();
      }, 3000);

    } catch (error: any) {
      console.error(error);
      setInitiateStatus(`❌ Error: ${error.message || 'Transfer failed'}`);
    }
  };

  const handleAcceptTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!acceptTokenId || !publicClient) return;

    try {
      setTransferCenterStatus('⏳ Accepting digital passport...');
      const hash = await writeContractAsync({
        address: OWNERSHIP_TRANSFER_ADDRESS as `0x${string}`,
        abi: ownershipTransferJson.abi,
        functionName: 'acceptTransfer',
        args: [BigInt(acceptTokenId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      setTransferCenterStatus('✅ Transfer accepted! Asset secured in your vault.');
      setAcceptTokenId('');
      loadInventory();
    } catch (error: any) {
      console.error(error);
      setTransferCenterStatus(`❌ Error: ${error.message || 'Failed to accept'}`);
    }
  };

  const handleCancelTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTokenId || !publicClient) return;

    try {
      setTransferCenterStatus('⏳ Canceling pending transfer...');
      const hash = await writeContractAsync({
        address: OWNERSHIP_TRANSFER_ADDRESS as `0x${string}`,
        abi: ownershipTransferJson.abi,
        functionName: 'cancelTransfer',
        args: [BigInt(cancelTokenId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      setTransferCenterStatus('✅ Transfer canceled. The asset remains in your vault.');
      setCancelTokenId('');
    } catch (error: any) {
      console.error(error);
      setTransferCenterStatus(`❌ Error: ${error.message || 'Failed to cancel'}`);
    }
  };

  const handleReportStolen = (tokenId: number) => {
    const asset = inventory.find(a => a.tokenId === tokenId);

    if (!asset) return;

    setStolenToken(tokenId);
    setStolenSerial(asset.serial);
    setStolenConfirmationSerial('');
    setStolenStatus('');
  };

  const confirmReportStolen = async (e: React.FormEvent) => {
    e.preventDefault();

    if (stolenToken === null || !publicClient) return;

    const normalizedExpected = stolenSerial.trim().toLowerCase();
    const normalizedEntered = stolenConfirmationSerial.trim().toLowerCase();

    if (normalizedEntered !== normalizedExpected) {
      setStolenStatus('❌ Serial number does not match.');
      return;
    }

    try {
      setStolenStatus('⏳ Sending report to blockchain...');

      const hash = await writeContractAsync({
        address: PROVENANCE_MANAGER_ADDRESS as `0x${string}`,
        abi: provenanceManagerJson.abi,
        functionName: 'reportStolen',
        args: [BigInt(stolenToken)],
      });

      setStolenStatus('⏳ Transaction sent. Awaiting confirmation...');

      await publicClient.waitForTransactionReceipt({ hash });

      setStolenStatus('✅ Asset reported as STOLEN and registered on the blockchain.');

      setTimeout(() => {
        closeStolenModal();
      }, 2500);

    } catch (error: any) {
      console.error(error);

      setStolenStatus(
        `❌ Error: ${error.message || 'Transaction failed.'}`
      );
    }
  };

  const closeTransferModal = () => {
    setSelectedToken(null);
    setRecipientAddress('');
    setInitiateStatus('');
  };

  const closeStolenModal = () => {
    setStolenToken(null);
    setStolenSerial('');
    setStolenConfirmationSerial('');
    setStolenStatus('');
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-5xl mx-auto relative">
      
      {/* Header with Serial Search Bar */}
      <div className="mb-8 pb-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-light text-slate-900 mb-1">Private Collector Vault</h2>
          <p className="text-slate-500 font-light text-sm">Manage your authentic digital watch passports.</p>
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
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300 mb-10">
          <span className="text-4xl mb-4 block">📦</span>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Your vault is empty</h3>
          <p className="text-sm text-slate-500">You do not own any registered digital passports yet.</p>
        </div>
      )}

      {/* Vault Grid Inventory */}
      {!isLoading && inventory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-fade-in">
          {filteredInventory.map((asset) => (
            <div key={asset.tokenId} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              
              {/* Image Container */}
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
                
                <div className="mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Physical Serial</span>
                  <span className="text-xs font-mono font-semibold bg-slate-100 text-slate-700 px-2 py-1 rounded inline-block">
                    {asset.serial}
                  </span>
                </div>

                <div className="space-y-1 mb-6 text-sm text-slate-500 flex-1">
                  {asset.metadata.attributes?.filter((attr: any) => attr.trait_type !== 'Physical Serial').slice(0, 2).map((attr: any, idx: number) => (
                    <div key={idx} className="flex justify-between border-b border-slate-50 pb-1">
                      <span className="text-slate-400 text-xs">{attr.trait_type}</span>
                      <span className="font-medium text-slate-700 text-xs">{attr.value}</span>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 mt-auto">
                  <button 
                    onClick={() => handleViewProvenance(asset.tokenId)}
                    className="w-full py-2 bg-slate-100 text-slate-800 rounded-lg hover:bg-slate-200 transition-colors font-medium text-xs border border-slate-300"
                  >
                    View Provenance History
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => setSelectedToken(asset.tokenId)}
                      className="py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-xs"
                    >
                      P2P Transfer
                    </button>
                    <button 
                      onClick={() => handleReportStolen(asset.tokenId)}
                      className="py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors font-medium text-xs"
                    >
                      Report Stolen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* INCOMING & PENDING TRANSFERS SECTION (Integrated directly at the bottom) */}
      <div className="pt-8 border-t border-slate-100">
        <h3 className="text-xl font-medium text-slate-900 mb-1">Transfer Center & Handshakes</h3>
        <p className="text-slate-500 font-light text-sm mb-6">Accept incoming digital passports or cancel pending outgoing transfers.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Accept Transfer Box */}
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
            <h4 className="text-md font-medium text-slate-800 mb-1">Accept Incoming Transfer</h4>
            <p className="text-xs text-slate-500 mb-4">Accept a pending digital passport handshake sent to your wallet.</p>
            
            <form onSubmit={handleAcceptTransfer} className="space-y-4">
              <div>
                <input 
                  required 
                  type="number"
                  min="1"
                  placeholder="Token ID (e.g. 1)" 
                  value={acceptTokenId} 
                  onChange={e => setAcceptTokenId(e.target.value)} 
                  className="w-full px-4 py-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm" 
                />
              </div>
              <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors font-medium text-sm shadow-sm">
                Accept Digital Passport
              </button>
            </form>
          </div>

          {/* Cancel Transfer Box */}
          <div className="bg-white p-6 rounded-xl border border-slate-200">
            <h4 className="text-md font-medium text-slate-800 mb-1">Cancel Outgoing Handshake</h4>
            <p className="text-xs text-slate-500 mb-4">Cancel a transfer you initiated if the buyer hasn't accepted yet.</p>
            
            <form onSubmit={handleCancelTransfer} className="space-y-4">
              <div>
                <input 
                  required 
                  type="number"
                  min="1"
                  placeholder="Token ID (e.g. 1)" 
                  value={cancelTokenId} 
                  onChange={e => setCancelTokenId(e.target.value)} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm" 
                />
              </div>
              <button type="submit" className="w-full py-3 bg-slate-100 text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm shadow-sm">
                Cancel Transfer
              </button>
            </form>
          </div>

          {transferCenterStatus && (
            <div className={`md:col-span-2 p-4 rounded-lg text-sm font-medium text-center ${transferCenterStatus.includes('❌') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {transferCenterStatus}
            </div>
          )}
        </div>
      </div>

      {/* PROVENANCE TIMELINE MODAL */}
      {historyTokenId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col animate-fade-in">
            
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-medium text-slate-900">Provenance Record</h3>
                <p className="text-xs text-slate-500 mt-1">Immutable ledger history for Token #{historyTokenId}</p>
              </div>
              <button onClick={closeHistoryModal} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
              {isHistoryLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-500 text-xs">Querying blockchain & resolving identities...</p>
                </div>
              ) : assetHistory.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No historical records found for this asset.
                </div>
              ) : (
                <div className="space-y-0 ml-2">
                  {assetHistory.map((evt, idx) => (
                    <div key={idx} className="relative pl-8 pb-8 border-l-2 border-slate-200 last:border-0 last:pb-0">
                      
                      <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-800 border-2 border-white shadow-sm"></div>
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border ${getEventBadgeStyle(evt.eventType, evt.subType)}`}>
                            {evt.subType ? (evt.subType.includes('B2B') ? 'B2B Distribution' : 'Retail / P2P') : evt.eventType}
                          </span>
                          {evt.subType && (
                            <span className="text-[10px] text-slate-400 font-medium">({evt.eventType})</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 font-medium mt-1 md:mt-0">
                          {formatDate(evt.timestamp)}
                        </span>
                      </div>
                      
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mt-2">
                        {evt.subType && (
                          <p className="text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 mb-2 w-fit">
                            📦 {evt.subType}
                          </p>
                        )}
                        <p className="text-sm text-slate-700 font-medium leading-snug">{evt.description}</p>
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                          <p className="text-xs font-semibold text-slate-800">
                            🏢 Actor: <span className="text-slate-900 font-bold">{evt.actorName}</span>
                          </p>
                          <p className="text-[9px] text-slate-400 font-mono">
                            {evt.actor.slice(0, 6)}...{evt.actor.slice(-4)}
                          </p>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* P2P TRANSFER INITIATE MODAL */}
      {selectedToken !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-medium text-slate-900">Initiate Secure Handshake</h3>
              <button onClick={closeTransferModal} className="text-slate-400 hover:text-slate-600 text-xl font-bold">&times;</button>
            </div>
            
            <p className="text-sm text-slate-500 mb-6">
              You are initiating a two-step peer-to-peer transfer for Watch <span className="font-bold text-slate-800">#{selectedToken}</span>.
            </p>

            <form onSubmit={handleInitiateTransfer} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Recipient Wallet Address</label>
                <input 
                  required 
                  placeholder="0x..." 
                  value={recipientAddress} 
                  onChange={e => setRecipientAddress(e.target.value)} 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm" 
                />
              </div>
              
              <button 
                type="submit" 
                disabled={!!initiateStatus && !initiateStatus.includes('Error')} 
                className="w-full py-3 mt-4 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium text-sm disabled:opacity-50 shadow-sm"
              >
                Initiate Transfer
              </button>
            </form>

            {initiateStatus && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-center text-sm font-medium text-slate-700">
                {initiateStatus}
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPORT STOLEN CONFIRMATION MODAL */}
      {stolenToken !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-fade-in">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-xl font-medium text-slate-900">
                  Report Asset as Stolen
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Security confirmation required
                </p>
              </div>

              <button
                onClick={closeStolenModal}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
                disabled={stolenStatus.startsWith('⏳')}
              >
                &times;
              </button>
            </div>

            {/* Warning */}
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>

                <div>
                  <p className="text-sm font-semibold text-red-800">
                    This action is permanent
                  </p>

                  <p className="text-xs text-red-600 mt-1 leading-relaxed">
                    Reporting this watch as stolen will create an immutable
                    provenance record on the blockchain.
                  </p>
                </div>
              </div>
            </div>

            {/* Asset information */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-slate-400 uppercase tracking-wider">
                  Token ID
                </span>

                <span className="text-sm font-bold text-slate-800">
                  #{stolenToken}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">
                  Physical Serial
                </span>

                <span className="font-mono font-bold text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg inline-block">
                  {stolenSerial}
                </span>
              </div>
            </div>

            {/* Serial confirmation */}
            <form onSubmit={confirmReportStolen} className="space-y-4">

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">
                  Enter the physical serial number to confirm
                </label>

                <input
                  required
                  type="text"
                  autoFocus
                  placeholder="Enter serial number exactly..."
                  value={stolenConfirmationSerial}
                  onChange={e => {
                    setStolenConfirmationSerial(e.target.value);
                    setStolenStatus('');
                  }}
                  disabled={stolenStatus.startsWith('⏳')}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 text-sm font-mono uppercase"
                />

                <p className="text-[11px] text-slate-400 mt-2">
                  For security, enter the serial number exactly as shown above.
                </p>
              </div>

              {/* Confirmation status */}
              {stolenStatus && (
                <div
                  className={`p-3 rounded-lg text-xs font-medium text-center ${
                    stolenStatus.includes('❌')
                      ? 'bg-red-50 text-red-600 border border-red-200'
                      : stolenStatus.includes('✅')
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-50 text-slate-600 border border-slate-200'
                  }`}
                >
                  {stolenStatus}
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3 pt-2">

                <button
                  type="button"
                  onClick={closeStolenModal}
                  disabled={stolenStatus.startsWith('⏳')}
                  className="py-3 bg-white text-slate-700 border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors font-medium text-sm disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    !stolenConfirmationSerial.trim() ||
                    stolenConfirmationSerial.trim().toLowerCase() !==
                      stolenSerial.trim().toLowerCase() ||
                    stolenStatus.startsWith('⏳')
                  }
                  className="py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Confirm Stolen
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}