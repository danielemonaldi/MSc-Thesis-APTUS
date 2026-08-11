'use client';

import { useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useReadContracts } from 'wagmi';

import roleManagerJson from '../abi/RoleManager.json';
import { ROLE_MANAGER_ADDRESS } from '../contracts';

import WelcomeScreen from '../components/WelcomeScreen';
import AdminDashboard from '../components/AdminDashboard';
import IssuerDashboard from '../components/IssuerDashboard';
import IssuerDistributionDashboard from '../components/IssuerDistributionDashboard';
import DealerDashboard from '../components/DealerDashboard';
import ServiceDashboard from '../components/ServiceDashboard';
import CustomerDashboard from '../components/CustomerDashboard';

// Define role constants
const ISSUER_ROLE = "0x114e74f6ea3bd819998f78687bfcb11b140da08e9b7d222fa9c1f1ba1f2aa122";
const SERVICE_ROLE = "0xd8a7a79547af723ee3e12b59a480111268d8969c634e1a34a144d2c8b91d635b";
const DEALER_ROLE = "0xcf75f067314df4d0527f2a9e12148d8bd7c8a3f7235b2171d24fa195d2c3ecb9";
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export default function Home() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<string>('');

  // Fetch role data for the connected user
  const { data: rolesData, isLoading } = useReadContracts({
    contracts: [
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, address] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [ISSUER_ROLE, address] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [SERVICE_ROLE, address] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [DEALER_ROLE, address] }
    ],
    query: { enabled: isConnected && !!address }
  });

  const isAdmin = rolesData?.[0]?.result ?? false;
  const isIssuer = rolesData?.[1]?.result ?? false;
  const isService = rolesData?.[2]?.result ?? false;
  const isDealer = rolesData?.[3]?.result ?? false;
  
  const hasNoSpecialRole = !isAdmin && !isIssuer && !isService && !isDealer;

  const availableTabs = [];
  if (isAdmin) availableTabs.push('admin');
  if (isIssuer) {
    availableTabs.push('issuer');
    availableTabs.push('distribution');
  }
  if (isDealer) availableTabs.push('dealer');
  if (isService) availableTabs.push('service');

  const currentTab = availableTabs.includes(activeTab) ? activeTab : availableTabs[0];

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-12 font-sans">
      
      <header className="flex flex-col md:flex-row justify-between items-center mb-12 pb-6 border-b border-slate-200">
        <h1 className="text-3xl font-light tracking-widest text-slate-900 mb-6 md:mb-0">
          APTUS
        </h1>
        <ConnectButton />
      </header>

      <main>
        {!isConnected && <WelcomeScreen />}

        {isConnected && isLoading && (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg animate-pulse font-light">
              Scanning blockchain permissions...
            </p>
          </div>
        )}

        {isConnected && !isLoading && hasNoSpecialRole && (
          <CustomerDashboard address={address} />
        )}

        {isConnected && !isLoading && availableTabs.length > 0 && (
          <div className="animate-fade-in">
            {availableTabs.length > 1 && (
              <div className="flex gap-4 mb-8 pb-4 border-b border-slate-200 overflow-x-auto">
                {isAdmin && (
                  <button 
                    onClick={() => setActiveTab('admin')} 
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${currentTab === 'admin' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    Admin Control
                  </button>
                )}
                {isIssuer && (
                  <>
                    <button 
                      onClick={() => setActiveTab('issuer')} 
                      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${currentTab === 'issuer' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      Issuer Panel
                    </button>
                    <button 
                      onClick={() => setActiveTab('distribution')} 
                      className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${currentTab === 'distribution' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                    >
                      B2B Distribution
                    </button>
                  </>
                )}
                {isDealer && (
                  <button 
                    onClick={() => setActiveTab('dealer')} 
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${currentTab === 'dealer' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    Dealer Panel
                  </button>
                )}
                {isService && (
                  <button 
                    onClick={() => setActiveTab('service')} 
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${currentTab === 'service' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                  >
                    Service Panel
                  </button>
                )}
              </div>
            )}

            {currentTab === 'admin' && <AdminDashboard />}
            {currentTab === 'issuer' && <IssuerDashboard address={address} />}
            {currentTab === 'distribution' && <IssuerDistributionDashboard address={address} />}
            {currentTab === 'dealer' && <DealerDashboard address={address} />}
            {currentTab === 'service' && <ServiceDashboard address={address} />}
          </div>
        )}
      </main>
    </div>
  );
}