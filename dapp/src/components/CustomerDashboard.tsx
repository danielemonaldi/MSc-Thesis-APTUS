'use client';

import { useState, useEffect } from 'react';
import { useWriteContract, usePublicClient, useWatchContractEvent } from 'wagmi';
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
  pendingRecipient?: string;
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
 * @dev Private collector vault featuring universal search, dynamic P2P handshakes, and live event listening.
 */
export default function CustomerDashboard({ address }: { address: string | undefined }) {
  const publicClient = usePublicClient();
  
  // Vault State & Search
  const [inventory, setInventory] = useState<WatchAsset[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<WatchAsset[]>([]);
  const [outgoingTransfers, setOutgoingTransfers] = useState<WatchAsset[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Transfer Modal State
  const [selectedToken, setSelectedToken] = useState<number | null>(null);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [initiateStatus, setInitiateStatus] = useState('');
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

  // Intelligent parallel scanning for inventory, incoming, and outgoing transfers
  const loadInventory = async () => {
    if (!publicClient || !address) return;
    
    // Mostriamo il caricamento solo se l'inventario è vuoto (evita sfarfallii durante i refresh live)
    if (inventory.length === 0 && incomingTransfers.length === 0 && outgoingTransfers.length === 0) {
      setIsLoading(true);
    }
    
    const tokenIds = Array.from({ length: 50 }, (_, i) => i + 1);

    const results = await Promise.all(
      tokenIds.map(async (tokenId) => {
        try {
          // Check Token Ownership
          let owner = '';
          try {
            owner = await publicClient.readContract({
              address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
              abi: assetRegistryJson.abi,
              functionName: 'ownerOf',
              args: [BigInt(tokenId)]
            }) as string;
          } catch(e) {
            return null; // Token does not exist yet
          }

          // Check for any Pending Transfers mapping
          let pendingRecipient = '0x0000000000000000000000000000000000000000';
          try {
            pendingRecipient = await publicClient.readContract({
              address: OWNERSHIP_TRANSFER_ADDRESS as `0x${string}`,
              abi: ownershipTransferJson.abi,
              functionName: 'pendingTransfers',
              args: [BigInt(tokenId)]
            }) as string;
          } catch(e) {
            // Mapping empty or not present
          }

          const isOwner = owner.toLowerCase() === address.toLowerCase();
          const isRecipient = pendingRecipient.toLowerCase() === address.toLowerCase();

          if (isOwner || isRecipient) {
            const uri = await publicClient.readContract({
              address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
              abi: assetRegistryJson.abi,
              functionName: 'tokenURI',
              args: [BigInt(tokenId)]
            }) as string;

            const gatewayUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
            const ipfsRes = await fetch(gatewayUrl);
            const metadata = await ipfsRes.json();

            const physicalSerial = metadata.attributes?.find((attr: any) => attr.trait_type === 'Physical Serial')?.value || `SN-${tokenId}`;

            let cleanName = metadata.name || 'Watch Asset';
            if (cleanName.includes(' - SN:')) {
              cleanName = cleanName.split(' - SN:')[0];
            }

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

            return { 
              tokenId, 
              serial: physicalSerial,
              name: cleanName,
              image: imageGateway,
              metadata,
              isOwner,
              isRecipient,
              pendingRecipient: pendingRecipient !== '0x0000000000000000000000000000000000000000' ? pendingRecipient : undefined
            };
          }
        } catch (error) {
          return null;
        }
        return null;
      })
    );
    
    const foundAssets: WatchAsset[] = [];
    const foundIncoming: WatchAsset[] = [];
    const foundOutgoing: WatchAsset[] = [];

    // Dynamically sort assets based on their transfer status
    results.forEach(res => {
      if (res) {
        if (res.isRecipient) {
          foundIncoming.push(res);
        } else if (res.isOwner && res.pendingRecipient) {
          foundOutgoing.push(res);
        } else if (res.isOwner) {
          foundAssets.push(res);
        }
      }
    });

    setInventory(foundAssets);
    setIncomingTransfers(foundIncoming);
    setOutgoingTransfers(foundOutgoing);
    setIsLoading(false);
  };

  useEffect(() => {
    loadInventory();
  }, [address, publicClient]); 

  // --- LIVE EVENT LISTENERS ---
  // Ricarica automaticamente l'inventario quando avvengono trasferimenti o handshake
  useWatchContractEvent({
    address: OWNERSHIP_TRANSFER_ADDRESS as `0x${string}`,
    abi: ownershipTransferJson.abi,
    onLogs() {
      console.log("Live Update: OwnershipTransfer event detected!");
      loadInventory();
    },
  });

  useWatchContractEvent({
    address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
    abi: assetRegistryJson.abi,
    eventName: 'Transfer',
    onLogs() {
      console.log("Live Update: AssetRegistry direct transfer detected!");
      loadInventory();
    },
  });
  // ----------------------------

  // General search: filters by name or serial
  const filteredInventory = inventory.filter(asset => 
    asset.name.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
    asset.serial.toLowerCase().includes(searchQuery.trim().toLowerCase())
  );

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
      if (subType?.includes('B2B')) return 'bg-amber-100 text-amber-800 border-amber-200';
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
        // Nota: non serve chiamare loadInventory() qui perché lo farà in automatico il listener live!
      }, 3000);

    } catch (error: any) {
      console.error(error);
      setInitiateStatus(`❌ Error: ${error.message || 'Transfer failed'}`);
    }
  };

  const handleAcceptTransfer = async (tokenId: number) => {
    if (!publicClient) return;
    try {
      setTransferCenterStatus(`⏳ Accepting digital passport for #${tokenId}...`);
      const hash = await writeContractAsync({
        address: OWNERSHIP_TRANSFER_ADDRESS as `0x${string}`,
        abi: ownershipTransferJson.abi,
        functionName: 'acceptTransfer',
        args: [BigInt(tokenId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      setTransferCenterStatus('✅ Transfer accepted! Asset secured in your vault.');
      setTimeout(() => setTransferCenterStatus(''), 4000);
      // Aggiornamento live automatico
    } catch (error: any) {
      console.error(error);
      setTransferCenterStatus(`❌ Error: ${error.message || 'Failed to accept'}`);
    }
  };

  const handleCancelTransfer = async (tokenId: number) => {
    if (!publicClient) return;
    try {
      setTransferCenterStatus(`⏳ Canceling pending transfer for #${tokenId}...`);
      const hash = await writeContractAsync({
        address: OWNERSHIP_TRANSFER_ADDRESS as `0x${string}`,
        abi: ownershipTransferJson.abi,
        functionName: 'cancelTransfer',
        args: [BigInt(tokenId)],
      });
      await publicClient.waitForTransactionReceipt({ hash });

      setTransferCenterStatus('✅ Transfer canceled. The asset remains in your vault.');
      setTimeout(() => setTransferCenterStatus(''), 4000);
      // Aggiornamento live automatico
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
      setStolenStatus(`❌ Error: ${error.message || 'Transaction failed.'}`);
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
      
      {/* Header with Universal Search Bar */}
      <div className="mb-8 pb-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-light text-slate-900 mb-1">Private Collector Vault</h2>
          <p className="text-slate-500 font-light text-sm">Manage your authentic digital watch passports.</p>
        </div>

        <div className="w-full md:w-72 mt-4 md:mt-0">
          <input 
            type="text"
            placeholder="🔍 Search model or serial..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm font-mono"
          />
        </div>
      </div>

      {/* VAULT GRID */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4"></div>
          <p className="text-slate-500 text-sm font-light">Scanning blockchain vault & transfers...</p>
        </div>
      )}

      {!isLoading && inventory.length === 0 && (
        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-300 mb-10">
          <span className="text-4xl mb-4 block">📦</span>
          <h3 className="text-lg font-medium text-slate-800 mb-2">Your vault is empty</h3>
          <p className="text-sm text-slate-500">You do not own any registered digital passports right now.</p>
        </div>
      )}

      {!isLoading && inventory.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 animate-fade-in">
          {filteredInventory.map((asset) => (
            <div key={asset.tokenId} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col">
              
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

      {/* DYNAMIC TRANSFER CENTER & HANDSHAKES (ALWAYS VISIBLE) */}
      {!isLoading && (
        <div className="pt-8 border-t border-slate-100 mt-12 animate-fade-in">
          <div className="mb-6">
            <h3 className="text-xl font-medium text-slate-900 mb-1">Transfer Center & Handshakes</h3>
            <p className="text-slate-500 font-light text-sm">Review and manage pending P2P transfers.</p>
          </div>

          {transferCenterStatus && (
            <div className={`mb-6 p-4 rounded-lg text-sm font-medium text-center ${transferCenterStatus.includes('❌') ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {transferCenterStatus}
            </div>
          )}

          {/* EMPTY STATE */}
          {incomingTransfers.length === 0 && outgoingTransfers.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center">
              <span className="text-3xl mb-3 block">🤝</span>
              <p className="text-slate-600 font-medium text-sm">No pending handshakes</p>
              <p className="text-slate-400 text-xs mt-1">Any incoming or unaccepted outgoing P2P transfers will appear here.</p>
            </div>
          ) : (
            <div className="space-y-8">
              
              {/* INCOMING TRANSFERS */}
              {incomingTransfers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>⬇️</span> Incoming Digital Passports
                  </h4>
                  <div className="space-y-4">
                    {incomingTransfers.map(asset => (
                      <div key={asset.tokenId} className="flex flex-col sm:flex-row bg-white border border-blue-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-full sm:w-48 h-48 sm:h-auto bg-blue-50/50 flex items-center justify-center p-4 border-b sm:border-b-0 sm:border-r border-blue-100 relative">
                          {asset.image ? (
                            <img src={asset.image} alt={asset.name} className="max-h-full max-w-full object-contain drop-shadow-sm" />
                          ) : (
                            <span className="text-5xl">⌚</span>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-lg font-medium text-slate-900">{asset.name}</h4>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                Action Required
                              </span>
                            </div>
                            <p className="text-xs font-mono text-slate-500 mb-4">Serial: {asset.serial} (ID: #{asset.tokenId})</p>
                            <p className="text-sm text-slate-600 mb-4">
                              A verified digital passport has been sent to your wallet. Accept the handshake to secure it in your vault.
                            </p>
                          </div>
                          <button 
                            onClick={() => handleAcceptTransfer(asset.tokenId)}
                            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
                          >
                            Accept Digital Passport
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* OUTGOING TRANSFERS */}
              {outgoingTransfers.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <span>⬆️</span> Pending Outgoing Handshakes
                  </h4>
                  <div className="space-y-4">
                    {outgoingTransfers.map(asset => (
                      <div key={asset.tokenId} className="flex flex-col sm:flex-row bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="w-full sm:w-48 h-48 sm:h-auto bg-slate-50 flex items-center justify-center p-4 border-b sm:border-b-0 sm:border-r border-slate-100 relative opacity-70 grayscale">
                          {asset.image ? (
                            <img src={asset.image} alt={asset.name} className="max-h-full max-w-full object-contain drop-shadow-sm" />
                          ) : (
                            <span className="text-5xl">⌚</span>
                          )}
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-1">
                              <h4 className="text-lg font-medium text-slate-900">{asset.name}</h4>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">
                                Pending Accept
                              </span>
                            </div>
                            <p className="text-xs font-mono text-slate-500 mb-4">Serial: {asset.serial} (ID: #{asset.tokenId})</p>
                            <p className="text-sm text-slate-600 mb-2">
                              Handshake initiated. Waiting for the recipient to accept the transfer.
                            </p>
                            <p className="text-xs font-mono bg-slate-50 p-2 rounded border border-slate-200 text-slate-500 break-all mb-4 w-fit">
                              To: {asset.pendingRecipient}
                            </p>
                          </div>
                          <button 
                            onClick={() => handleCancelTransfer(asset.tokenId)}
                            className="w-full sm:w-auto px-6 py-2.5 bg-white text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm shadow-sm"
                          >
                            Cancel Handshake
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>
      )}

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