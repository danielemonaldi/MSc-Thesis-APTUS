'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useReadContract } from 'wagmi';
import assetRegistryJson from '../abi/AssetRegistry.json';
import { ASSET_REGISTRY_ADDRESS } from '../contracts';

export default function Home() {

  // Read the name of the NFT collection from the Asset Registry contract
  const { data: contractName, isLoading, isError } = useReadContract({
    address: ASSET_REGISTRY_ADDRESS,
    abi: assetRegistryJson.abi,
    functionName: 'name',
  });

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <h1>APTUS dApp</h1>
        <ConnectButton />
      </header>

      <main>
        <h2>Blockchain Connection Status</h2>
        
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
          <p><strong>Contract Interrogated:</strong> Asset Registry</p>
          <p>
            <strong>NFT Collection Name: </strong> 
            {isLoading ? 'Loading from blockchain...' : isError ? 'Error reading!' : String(contractName)}
          </p>
        </div>
      </main>
    </div>
  );
}