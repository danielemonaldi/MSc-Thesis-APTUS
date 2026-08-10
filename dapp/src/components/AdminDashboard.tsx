'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { isAddress } from 'viem';
import roleManagerJson from '../abi/RoleManager.json';
import { ROLE_MANAGER_ADDRESS } from '../contracts';

const ISSUER_ROLE = "0x114e74f6ea3bd819998f78687bfcb11b140da08e9b7d222fa9c1f1ba1f2aa122";
const SERVICE_ROLE = "0xd8a7a79547af723ee3e12b59a480111268d8969c634e1a34a144d2c8b91d635b";
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export default function AdminDashboard() {
  // State for the Role Auditor (Checking roles)
  const [checkAddress, setCheckAddress] = useState('');
  
  // State for the Role Manager (Assigning/Revoking roles)
  const [manageAddress, setManageAddress] = useState('');
  const [selectedRole, setSelectedRole] = useState(ISSUER_ROLE);
  const [action, setAction] = useState<'grantRole' | 'revokeRole'>('grantRole');

  // Hook to execute the smart contract write operation
  const { data: txHash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Hook to read multiple roles at once for a specific address
  const { data: rolesData, refetch: fetchRoles, isFetching: isFetchingRoles } = useReadContracts({
    contracts: [
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, checkAddress] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [ISSUER_ROLE, checkAddress] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [SERVICE_ROLE, checkAddress] }
    ],
    query: {
      enabled: false, // Prevent auto-fetching, we only fetch when the user clicks the button
    }
  });

  const handleCheckRoles = () => {
    if (isAddress(checkAddress)) {
      fetchRoles();
    } else {
      alert("Invalid Ethereum Address");
    }
  };

  const handleManageRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddress(manageAddress)) {
      alert("Invalid Ethereum Address");
      return;
    }

    try {
      await writeContractAsync({
        address: ROLE_MANAGER_ADDRESS as `0x${string}`,
        abi: roleManagerJson.abi,
        functionName: action,
        args: [selectedRole, manageAddress],
      });
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#fdf2f8', borderRadius: '12px', border: '1px solid #fbcfe8' }}>
      <h2 style={{ color: '#be185d' }}>Admin Control Center</h2>
      <p style={{ color: '#9d174d', marginBottom: '2rem', fontSize: '0.9rem' }}>Supreme privileges active. Manage ecosystem roles.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        
        {/* PANEL 1: ROLE AUDITOR */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#334155', marginBottom: '1rem', fontSize: '1.1rem' }}>Role Auditor</h3>
          <p style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: '1rem' }}>Check active roles for any wallet address.</p>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              placeholder="0x..." 
              value={checkAddress} 
              onChange={(e) => setCheckAddress(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
            <button 
              onClick={handleCheckRoles}
              disabled={isFetchingRoles}
              style={{ padding: '0.5rem 1rem', backgroundColor: '#334155', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              {isFetchingRoles ? 'Checking...' : 'Check'}
            </button>
          </div>

          {/* Results Area */}
          {rolesData && (
            <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ padding: '0.5rem', backgroundColor: rolesData[0].result ? '#dcfce7' : '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                🛡️ <strong>Admin:</strong> {rolesData[0].result ? '✅ Yes' : '❌ No'}
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: rolesData[1].result ? '#dcfce7' : '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                🏭 <strong>Issuer:</strong> {rolesData[1].result ? '✅ Yes' : '❌ No'}
              </div>
              <div style={{ padding: '0.5rem', backgroundColor: rolesData[2].result ? '#dcfce7' : '#f1f5f9', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                🔧 <strong>Service:</strong> {rolesData[2].result ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          )}
        </div>

        {/* PANEL 2: ROLE MANAGER */}
        <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
          <h3 style={{ color: '#334155', marginBottom: '1rem', fontSize: '1.1rem' }}>Role Manager</h3>
          
          <form onSubmit={handleManageRole} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>Target Wallet Address</label>
              <input 
                required 
                placeholder="0x..." 
                value={manageAddress} 
                onChange={(e) => setManageAddress(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>Select Role</label>
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
              >
                <option value={ISSUER_ROLE}>Issuer (Brand Manufacturer)</option>
                <option value={SERVICE_ROLE}>Service (Maintenance Center)</option>
                <option value={DEFAULT_ADMIN_ROLE}>Admin (Supreme Privilege)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.3rem' }}>Action</label>
              <select 
                value={action} 
                onChange={(e) => setAction(e.target.value as 'grantRole' | 'revokeRole')}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'white' }}
              >
                <option value="grantRole">Grant Role (Add)</option>
                <option value="revokeRole">Revoke Role (Remove)</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isPending || isConfirming}
              style={{ padding: '0.8rem', backgroundColor: action === 'grantRole' ? '#059669' : '#dc2626', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', marginTop: '0.5rem' }}
            >
              {isPending || isConfirming ? 'Processing Transaction...' : action === 'grantRole' ? 'Grant Access' : 'Revoke Access'}
            </button>
          </form>

          {/* Transaction Status */}
          {isConfirming && <p style={{ color: '#d97706', fontSize: '0.9rem', marginTop: '1rem' }}>⏳ Waiting for block confirmation...</p>}
          {isConfirmed && <p style={{ color: '#15803d', fontSize: '0.9rem', marginTop: '1rem' }}>🎉 Transaction successful!</p>}
        </div>

      </div>
    </div>
  );
}