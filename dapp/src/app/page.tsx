'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContracts } from 'wagmi';

import roleManagerJson from '../abi/RoleManager.json';
import { ROLE_MANAGER_ADDRESS } from '../contracts';

import WelcomeScreen from '../components/WelcomeScreen';
import AdminDashboard from '../components/AdminDashboard';
import IssuerDashboard from '../components/IssuerDashboard';
import ServiceDashboard from '../components/ServiceDashboard';
import CustomerDashboard from '../components/CustomerDashboard';

// Role Hashes
const ISSUER_ROLE = "0x114e74f6ea3bd819998f78687bfcb11b140da08e9b7d222fa9c1f1ba1f2aa122";
const SERVICE_ROLE = "0xd8a7a79547af723ee3e12b59a480111268d8969c634e1a34a144d2c8b91d635b";
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<string>('');

  // Fetch all roles at once using useReadContracts to optimize RPC calls
  const { data: rolesData, isLoading } = useReadContracts({
    contracts: [
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, address] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [ISSUER_ROLE, address] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [SERVICE_ROLE, address] }
    ],
    query: { enabled: isConnected && !!address }
  });

  // Extract boolean results safely
  const isAdmin = rolesData?.[0]?.result ?? false;
  const isIssuer = rolesData?.[1]?.result ?? false;
  const isService = rolesData?.[2]?.result ?? false;
  const hasNoSpecialRole = !isAdmin && !isIssuer && !isService;

  // Dynamically build the available tabs based on user permissions
  const availableTabs = [];
  if (isAdmin) availableTabs.push('admin');
  if (isIssuer) availableTabs.push('issuer');
  if (isService) availableTabs.push('service');

  // Fallback to the first available tab if the current activeTab is not allowed or empty
  const currentTab = availableTabs.includes(activeTab) ? activeTab : availableTabs[0];

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '1000px', margin: '0 auto' }}>
      
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', paddingBottom: '1rem', borderBottom: '1px solid #e2e8f0' }}>
        <h1 style={{ fontSize: '1.8rem', color: '#0f172a', margin: 0 }}>APTUS</h1>
        <ConnectButton />
      </header>

      <main>
        {!isConnected && <WelcomeScreen />}

        {isConnected && isLoading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Scanning blockchain permissions...</p>
          </div>
        )}

        {/* Customer View (No special roles) */}
        {isConnected && !isLoading && hasNoSpecialRole && (
          <CustomerDashboard address={address} />
        )}

        {/* Staff / Admin View (Has at least one special role) */}
        {isConnected && !isLoading && availableTabs.length > 0 && (
          <div>
            {/* Tab Navigation Menu (Only render if there are multiple roles to switch between) */}
            {availableTabs.length > 1 && (
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
                {isAdmin && (
                  <button onClick={() => setActiveTab('admin')} style={getTabStyle(currentTab === 'admin', '#be185d')}>
                    Admin Control
                  </button>
                )}
                {isIssuer && (
                  <button onClick={() => setActiveTab('issuer')} style={getTabStyle(currentTab === 'issuer', '#0f172a')}>
                    Issuer Panel
                  </button>
                )}
                {isService && (
                  <button onClick={() => setActiveTab('service')} style={getTabStyle(currentTab === 'service', '#854d0e')}>
                    Service Panel
                  </button>
                )}
              </div>
            )}

            {/* Render the specific dashboard based on the active tab */}
            {currentTab === 'admin' && <AdminDashboard />}
            {currentTab === 'issuer' && <IssuerDashboard address={address} />}
            {currentTab === 'service' && <ServiceDashboard address={address} />}
          </div>
        )}
      </main>
    </div>
  );
}

// Helper function to dynamically style the tabs
function getTabStyle(isActive: boolean, activeColor: string) {
  return {
    padding: '0.6rem 1.2rem',
    border: 'none',
    backgroundColor: isActive ? activeColor : 'transparent',
    color: isActive ? 'white' : '#64748b',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    transition: 'all 0.2s ease-in-out'
  };
}