'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { isAddress } from 'viem';
import roleManagerJson from '../abi/RoleManager.json';
import { ROLE_MANAGER_ADDRESS } from '../contracts';

// Define role constants
const ISSUER_ROLE = "0x114e74f6ea3bd819998f78687bfcb11b140da08e9b7d222fa9c1f1ba1f2aa122";
const SERVICE_ROLE = "0xd8a7a79547af723ee3e12b59a480111268d8969c634e1a34a144d2c8b91d635b";
const DEALER_ROLE = "0xcf75f067314df4d0527f2a9e12148d8bd7c8a3f7235b2171d24fa195d2c3ecb9";
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export default function AdminDashboard() {
  const [checkAddress, setCheckAddress] = useState('');
  const [manageAddress, setManageAddress] = useState('');
  const [selectedRole, setSelectedRole] = useState(ISSUER_ROLE);
  const [action, setAction] = useState<'grantRole' | 'revokeRole'>('grantRole');

  const { data: txHash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const { data: rolesData, refetch: fetchRoles, isFetching: isFetchingRoles } = useReadContracts({
    contracts: [
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, checkAddress] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [ISSUER_ROLE, checkAddress] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [SERVICE_ROLE, checkAddress] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [DEALER_ROLE, checkAddress] } // Aggiunto controllo Dealer
    ],
    query: { enabled: false }
  });

  const handleCheckRoles = () => {
    if (isAddress(checkAddress)) fetchRoles();
    else alert("Invalid Ethereum Address");
  };

  const handleManageRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAddress(manageAddress)) return alert("Invalid Ethereum Address");
    try {
      await writeContractAsync({
        address: ROLE_MANAGER_ADDRESS as `0x${string}`,
        abi: roleManagerJson.abi,
        functionName: action,
        args: [selectedRole, manageAddress],
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6">
      <h2 className="text-2xl font-light text-slate-900 mb-1">Admin Control Center</h2>
      <p className="text-slate-500 mb-8 font-light text-sm">Supreme privileges active. Manage ecosystem roles.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Role Auditor */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-medium text-slate-800 mb-2">Role Auditor</h3>
          <p className="text-xs text-slate-500 mb-4">Check active roles for any wallet address.</p>
          
          <div className="flex gap-2 mb-6">
            <input 
              placeholder="0x..." 
              value={checkAddress} 
              onChange={(e) => setCheckAddress(e.target.value)}
              className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
            />
            <button 
              onClick={handleCheckRoles}
              disabled={isFetchingRoles}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              {isFetchingRoles ? '...' : 'Check'}
            </button>
          </div>

          {rolesData && (
            <div className="space-y-2 text-sm">
              <div className={`p-3 rounded-lg border ${rolesData[0].result ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-slate-200 text-slate-600'}`}>
                🛡️ <span className="font-medium ml-2">Admin:</span> {rolesData[0].result ? 'Granted' : 'None'}
              </div>
              <div className={`p-3 rounded-lg border ${rolesData[1].result ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-slate-200 text-slate-600'}`}>
                🏭 <span className="font-medium ml-2">Issuer:</span> {rolesData[1].result ? 'Granted' : 'None'}
              </div>
              <div className={`p-3 rounded-lg border ${rolesData[3].result ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-200 text-slate-600'}`}>
                🏬 <span className="font-medium ml-2">Dealer:</span> {rolesData[3].result ? 'Granted' : 'None'}
              </div>
              <div className={`p-3 rounded-lg border ${rolesData[2].result ? 'bg-green-50 border-green-200 text-green-800' : 'bg-white border-slate-200 text-slate-600'}`}>
                🔧 <span className="font-medium ml-2">Service:</span> {rolesData[2].result ? 'Granted' : 'None'}
              </div>
            </div>
          )}
        </div>

        {/* Role Manager */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-medium text-slate-800 mb-4">Role Manager</h3>
          
          <form onSubmit={handleManageRole} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Target Wallet Address</label>
              <input 
                required 
                placeholder="0x..." 
                value={manageAddress} 
                onChange={(e) => setManageAddress(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Select Role</label>
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
              >
                <option value={ISSUER_ROLE}>Issuer (Brand Manufacturer)</option>
                <option value={DEALER_ROLE}>Dealer (Authorized Retailer)</option>
                <option value={SERVICE_ROLE}>Service (Maintenance Center)</option>
                <option value={DEFAULT_ADMIN_ROLE}>Admin (Supreme Privilege)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
              <select 
                value={action} 
                onChange={(e) => setAction(e.target.value as 'grantRole' | 'revokeRole')}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
              >
                <option value="grantRole">Grant Role (Add)</option>
                <option value="revokeRole">Revoke Role (Remove)</option>
              </select>
            </div>

            <button 
              type="submit" 
              disabled={isPending || isConfirming}
              className={`w-full py-3 mt-2 rounded-lg text-white font-medium text-sm transition-colors ${action === 'grantRole' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} disabled:opacity-50`}
            >
              {isPending || isConfirming ? 'Processing...' : action === 'grantRole' ? 'Grant Access' : 'Revoke Access'}
            </button>
          </form>

          {isConfirming && <p className="text-amber-600 text-sm mt-4">⏳ Waiting for block confirmation...</p>}
          {isConfirmed && <p className="text-emerald-600 text-sm mt-4">🎉 Transaction successful!</p>}
        </div>
      </div>
    </div>
  );
}