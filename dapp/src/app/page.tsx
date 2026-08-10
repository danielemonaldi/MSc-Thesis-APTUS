'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContract } from 'wagmi';

import roleManagerJson from '../abi/RoleManager.json';
import { ROLE_MANAGER_ADDRESS } from '../contracts';

import WelcomeScreen from '../components/WelcomeScreen';
import IssuerDashboard from '../components/IssuerDashboard';
import ServiceDashboard from '../components/ServiceDashboard';
import CustomerDashboard from '../components/CustomerDashboard';

// Define role identifiers for permission checks
const ISSUER_ROLE = "0x114e74f6ea3bd819998f78687bfcb11b140da08e9b7d222fa9c1f1ba1f2aa122";
const SERVICE_ROLE = "0xd8a7a79547af723ee3e12b59a480111268d8969c634e1a34a144d2c8b91d635b";

export default function Home() {
  const { address, isConnected } = useAccount();
  
  // State to handle tab switching for multi-role users
  const [activeTab, setActiveTab] = useState<'issuer' | 'service'>('issuer');

  // 1. Check if the connected address has the Issuer role
  const { data: isIssuer, isLoading: isIssuerLoading } = useReadContract({
    address: ROLE_MANAGER_ADDRESS as `0x${string}`,
    abi: roleManagerJson.abi,
    functionName: 'hasRole',
    args: address ? [ISSUER_ROLE, address] : undefined,
    query: { enabled: isConnected }
  });

  // 2. Check if the connected address has the Service role
  const { data: isService, isLoading: isServiceLoading } = useReadContract({
    address: ROLE_MANAGER_ADDRESS as `0x${string}`,
    abi: roleManagerJson.abi,
    functionName: 'hasRole',
    args: address ? [SERVICE_ROLE, address] : undefined,
    query: { enabled: isConnected }
  });

  const isLoading = isIssuerLoading || isServiceLoading;
  
  // Helper variable to determine if the user has BOTH roles
  const isMultiRole = isIssuer && isService;

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* Navbar / Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#0f172a', margin: 0 }}>APTUS</h1>
        <ConnectButton />
      </header>

      {/* Main Routing Logic */}
      <main>
        {/* Scenario 1: Wallet not connected */}
        {!isConnected ? <WelcomeScreen /> : null}

        {/* Scenario 2: Permission verification in progress */}
        {isConnected && isLoading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Verifying blockchain permissions...</p>
          </div>
        ) : null}

        {/* Scenario 3: Multi-Role User (Has BOTH Issuer and Service roles) */}
        {isConnected && !isLoading && isMultiRole ? (
          <div>
            {/* Tab Navigation Menu */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <button 
                onClick={() => setActiveTab('issuer')}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: activeTab === 'issuer' ? '#0f172a' : 'transparent',
                  color: activeTab === 'issuer' ? 'white' : '#64748b',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Issuer Mode
              </button>
              <button 
                onClick={() => setActiveTab('service')}
                style={{
                  padding: '0.5rem 1rem',
                  border: 'none',
                  backgroundColor: activeTab === 'service' ? '#854d0e' : 'transparent',
                  color: activeTab === 'service' ? 'white' : '#64748b',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                Service Mode
              </button>
            </div>
            
            {/* Render the selected dashboard */}
            {activeTab === 'issuer' ? <IssuerDashboard address={address} /> : <ServiceDashboard address={address} />}
          </div>
        ) : null}

        {/* Scenario 4: User is ONLY Issuer */}
        {isConnected && !isLoading && isIssuer && !isService ? (
          <IssuerDashboard address={address} />
        ) : null}

        {/* Scenario 5: User is ONLY Service */}
        {isConnected && !isLoading && isService && !isIssuer ? (
          <ServiceDashboard address={address} />
        ) : null}

        {/* Scenario 6: Standard Customer Dashboard (Has neither role) */}
        {isConnected && !isLoading && !isIssuer && !isService ? (
          <CustomerDashboard address={address} />
        ) : null}
      </main>

    </div>
  );
}