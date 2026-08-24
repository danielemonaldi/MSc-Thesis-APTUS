'use client';

import { useState } from 'react';
import { usePublicClient } from 'wagmi';

import assetRegistryJson from '../abi/AssetRegistry.json';
import provenanceManagerJson from '../abi/ProvenanceManager.json';
import roleManagerJson from '../abi/RoleManager.json';

import { 
  ASSET_REGISTRY_ADDRESS, 
  PROVENANCE_MANAGER_ADDRESS,
  ROLE_MANAGER_ADDRESS
} from '../contracts';

interface ProvenanceEvent {
  timestamp: bigint;
  eventType: string;
  description: string;
  actor: string;
  actorName?: string;
  subType?: string;
}

interface ExploredAsset {
  tokenId: number;
  serial: string;
  name: string;
  image: string;
  owner: string;
  metadata: any;
  isStolen: boolean;
  history: ProvenanceEvent[];
}

/**
 * @title PublicExplorer
 * @dev Read-only dashboard for prospective buyers and external observers to verify authenticity and provenance.
 */
export default function PublicExplorer() {
  const publicClient = usePublicClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [assetData, setAssetData] = useState<ExploredAsset | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicClient || !searchQuery.trim()) return;

    setIsSearching(true);
    setSearchStatus('Querying blockchain ledger...');
    setAssetData(null);

    try {
      let foundTokenId: number | null = null;
      let foundMetadata: any = null;
      let foundOwner: string = '';

      const isNumeric = /^\d+$/.test(searchQuery.trim());

      // If numeric, try direct Token ID lookup first
      if (isNumeric) {
        const tokenId = parseInt(searchQuery.trim());
        try {
          foundOwner = await publicClient.readContract({
            address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
            abi: assetRegistryJson.abi,
            functionName: 'ownerOf',
            args: [BigInt(tokenId)]
          }) as string;
          foundTokenId = tokenId;
        } catch (err) {
          // Token doesn't exist
        }
      }

      // If not found by ID, scan by Physical Serial
      if (foundTokenId === null) {
        for (let i = 1; i <= 50; i++) {
          try {
            const uri = await publicClient.readContract({
              address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
              abi: assetRegistryJson.abi,
              functionName: 'tokenURI',
              args: [BigInt(i)]
            }) as string;

            const gatewayUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
            const res = await fetch(gatewayUrl);
            const metadata = await res.json();
            const physicalSerial = metadata.attributes?.find((attr: any) => attr.trait_type === 'Physical Serial')?.value || '';

            if (physicalSerial.toLowerCase() === searchQuery.trim().toLowerCase()) {
              foundTokenId = i;
              foundOwner = await publicClient.readContract({
                address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
                abi: assetRegistryJson.abi,
                functionName: 'ownerOf',
                args: [BigInt(i)]
              }) as string;
              foundMetadata = metadata;
              break;
            }
          } catch (err) {
            break; // Stop loop on first non-existent token
          }
        }
      } else {
        // We have the ID, fetch its metadata
        const uri = await publicClient.readContract({
          address: ASSET_REGISTRY_ADDRESS as `0x${string}`,
          abi: assetRegistryJson.abi,
          functionName: 'tokenURI',
          args: [BigInt(foundTokenId)]
        }) as string;
        const gatewayUrl = uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
        const res = await fetch(gatewayUrl);
        foundMetadata = await res.json();
      }

      if (foundTokenId !== null && foundMetadata) {
        setSearchStatus('Fetching provenance history...');
        
        // Fetch History
        const historyRaw = await publicClient.readContract({
          address: PROVENANCE_MANAGER_ADDRESS as `0x${string}`,
          abi: provenanceManagerJson.abi,
          functionName: 'getAssetHistory',
          args: [BigInt(foundTokenId)]
        }) as any[];

        const rawEvents = historyRaw.map(evt => ({
          timestamp: evt.timestamp ?? evt[0] ?? BigInt(0),
          eventType: evt.eventType ?? evt[1] ?? 'UNKNOWN',
          description: evt.details ?? evt[2] ?? 'No description provided.',
          actor: evt.reporter ?? evt[3] ?? 'Unknown Actor'
        }));

        let isStolen = false;
        const formattedHistory: ProvenanceEvent[] = [];

        for (const evt of rawEvents) {
          if (evt.eventType.toUpperCase() === 'STOLEN') isStolen = true;

          let actorName = 'Unknown Entity';
          try {
            const name = await publicClient.readContract({
              address: ROLE_MANAGER_ADDRESS as `0x${string}`,
              abi: roleManagerJson.abi,
              functionName: 'getEntityName',
              args: [evt.actor as `0x${string}`]
            });
            if (name && typeof name === 'string' && name !== '') actorName = name;
          } catch (e) {}

          formattedHistory.push({ ...evt, actorName });
        }

        formattedHistory.sort((a, b) => Number(b.timestamp) - Number(a.timestamp));

        // Clean formatting
        let cleanName = foundMetadata.name || 'Watch Asset';
        if (cleanName.includes(' - SN:')) cleanName = cleanName.split(' - SN:')[0];
        
        let imageGateway = '';
        if (foundMetadata.image) {
          imageGateway = foundMetadata.image.startsWith('ipfs://') 
            ? foundMetadata.image.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/') 
            : foundMetadata.image.startsWith('http') ? foundMetadata.image : `https://gateway.pinata.cloud/ipfs/${foundMetadata.image}`;
        }

        const physicalSerial = foundMetadata.attributes?.find((attr: any) => attr.trait_type === 'Physical Serial')?.value || `SN-${foundTokenId}`;

        setAssetData({
          tokenId: foundTokenId,
          serial: physicalSerial,
          name: cleanName,
          image: imageGateway,
          owner: foundOwner,
          metadata: foundMetadata,
          isStolen,
          history: formattedHistory
        });
        setSearchStatus('');
      } else {
        setSearchStatus('❌ No registered asset found with this Serial or Token ID.');
      }
    } catch (error) {
      console.error(error);
      setSearchStatus('❌ Error querying the blockchain.');
    } finally {
      setIsSearching(false);
    }
  };

  const formatDate = (unixTimestamp: bigint) => {
    const date = new Date(Number(unixTimestamp) * 1000);
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getEventBadgeStyle = (eventType: string) => {
    switch(eventType.toUpperCase()) {
      case 'CREATED': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TRANSFERRED': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'MAINTENANCE': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'STOLEN': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-5xl mx-auto relative animate-fade-in">
      
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h2 className="text-3xl font-light text-slate-900 mt-1 mb-1">Asset Explorer</h2>
          <p className="text-slate-500 font-light text-sm">Verify authenticity, check ownership, and inspect provenance history.</p>
        </div>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-10 max-w-2xl">
        <div className="flex gap-4">
          <input 
            type="text"
            required
            placeholder="Enter Serial Number or Token ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm font-mono"
          />
          <button 
            type="submit" 
            disabled={isSearching}
            className="px-8 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors font-medium text-sm disabled:opacity-50 shadow-sm"
          >
            {isSearching ? 'Querying...' : 'Verify Asset'}
          </button>
        </div>
        {searchStatus && <p className="mt-3 text-sm font-medium text-slate-600">{searchStatus}</p>}
      </form>

      {/* Results Section */}
      {assetData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
          
          {/* Asset Card */}
          <div className="lg:col-span-1">
            <div className={`bg-white border ${assetData.isStolen ? 'border-red-400 ring-2 ring-red-100' : 'border-slate-200'} rounded-2xl overflow-hidden shadow-sm flex flex-col`}>
              {assetData.isStolen && (
                <div className="bg-red-600 text-white text-center py-2 text-xs font-bold uppercase tracking-widest">
                  ⚠️ Reported Stolen
                </div>
              )}
              
              <div className="bg-slate-50 h-64 w-full flex items-center justify-center border-b border-slate-100 overflow-hidden relative p-6">
                {assetData.image ? (
                  <img src={assetData.image} alt={assetData.name} className={`max-h-full max-w-full object-contain drop-shadow-sm ${assetData.isStolen ? 'grayscale' : ''}`} />
                ) : (
                  <span className="text-5xl">⌚</span>
                )}
                <span className="absolute top-3 right-3 bg-black/70 text-white text-xs font-bold px-2.5 py-1 rounded backdrop-blur-sm">
                  ID: #{assetData.tokenId}
                </span>
              </div>
              
              <div className="p-6">
                <h3 className="text-xl font-medium text-slate-900 mb-2">{assetData.name}</h3>
                
                <div className="mb-6">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">Physical Serial</span>
                  <span className="text-sm font-mono font-semibold bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg inline-block border border-slate-200">
                    {assetData.serial}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-500 mb-6">
                  {assetData.metadata.attributes?.filter((attr: any) => attr.trait_type !== 'Physical Serial').map((attr: any, idx: number) => (
                    <div key={idx} className="flex justify-between border-b border-slate-50 pb-2">
                      <span className="text-slate-400">{attr.trait_type}</span>
                      <span className="font-medium text-slate-700">{attr.value}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Current Owner Address</span>
                  <span className="text-xs font-mono text-slate-600 break-all">{assetData.owner}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Provenance Timeline */}
          <div className="lg:col-span-2">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8 h-full">
              <h3 className="text-lg font-medium text-slate-900 mb-6 flex items-center gap-2">
                <span>📜</span> Immutable Provenance Ledger
              </h3>
              
              <div className="space-y-0 ml-2">
                {assetData.history.map((evt, idx) => (
                  <div key={idx} className="relative pl-8 pb-8 border-l-2 border-slate-200 last:border-0 last:pb-0">
                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-800 border-2 border-white shadow-sm"></div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between mb-2">
                      <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border w-fit ${getEventBadgeStyle(evt.eventType)}`}>
                        {evt.eventType}
                      </span>
                      <span className="text-xs text-slate-400 font-medium mt-2 md:mt-0">
                        {formatDate(evt.timestamp)}
                      </span>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm mt-3">
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">{evt.description}</p>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                        <p className="text-xs font-semibold text-slate-800">
                          🏢 Actor: <span className="text-slate-900 font-bold">{evt.actorName}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {evt.actor}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}