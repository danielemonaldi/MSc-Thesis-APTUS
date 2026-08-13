'use client';

import { useState } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useReadContracts } from 'wagmi';
import { isAddress } from 'viem';
import roleManagerJson from '../abi/RoleManager.json';
import { ROLE_MANAGER_ADDRESS } from '../contracts';

// Define role constants matching the RoleManager contract
const ISSUER_ROLE = "0x114e74f6ea3bd819998f78687bfcb11b140da08e9b7d222fa9c1f1ba1f2aa122";
const SERVICE_ROLE = "0xd8a7a79547af723ee3e12b59a480111268d8969c634e1a34a144d2c8b91d635b";
const DEALER_ROLE = "0xcf75f067314df4d0527f2a9e12148d8bd7c8a3f7235b2171d24fa195d2c3ecb9";
const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

export default function AdminDashboard() {
  const [checkAddress, setCheckAddress] = useState('');
  const [manageAddress, setManageAddress] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [selectedRole, setSelectedRole] = useState(ISSUER_ROLE);
  const [action, setAction] = useState<'grant' | 'revoke'>('grant');

  const { data: txHash, writeContractAsync, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  // Read role status and entity identity name from contract
  const { data: rolesData, refetch: fetchRoles, isFetching: isFetchingRoles } = useReadContracts({
    contracts: [
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [DEFAULT_ADMIN_ROLE, checkAddress] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [ISSUER_ROLE, checkAddress] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [SERVICE_ROLE, checkAddress] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'hasRole', args: [DEALER_ROLE, checkAddress] },
      { address: ROLE_MANAGER_ADDRESS as `0x${string}`, abi: roleManagerJson.abi, functionName: 'getEntityName', args: [checkAddress] }
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
      let functionName = '';
      let args: any[] = [];

      if (action === 'grant') {
        if (!companyName) return alert("Please insert a company name for KYB.");
        if (selectedRole === ISSUER_ROLE) {
          functionName = 'grantIssuerRole';
          args = [manageAddress, companyName];
        } else if (selectedRole === DEALER_ROLE) {
          functionName = 'grantDealerRole';
          args = [manageAddress, companyName];
        } else if (selectedRole === SERVICE_ROLE) {
          functionName = 'grantServiceRole';
          args = [manageAddress, companyName];
        } else {
          alert("Admin role assignment via UI is restricted for security.");
          return;
        }
      } else {
        // Revoke actions
        if (selectedRole === ISSUER_ROLE) {
          functionName = 'revokeIssuerRole';
          args = [manageAddress];
        } else if (selectedRole === DEALER_ROLE) {
          functionName = 'revokeDealerRole';
          args = [manageAddress];
        } else if (selectedRole === SERVICE_ROLE) {
          functionName = 'revokeServiceRole';
          args = [manageAddress];
        } else {
          alert("Admin role revocation via UI is restricted for security.");
          return;
        }
      }

      await writeContractAsync({
        address: ROLE_MANAGER_ADDRESS as `0x${string}`,
        abi: roleManagerJson.abi,
        functionName,
        args,
      });
    } catch (error) {
      console.error(error);
      alert("Transaction failed. Make sure you are connected with the Admin wallet.");
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6 max-w-5xl mx-auto">
      <h2 className="text-2xl font-light text-slate-900 mb-1">Admin Control Center</h2>
      <p className="text-slate-500 mb-8 font-light text-sm">Supreme privileges active. Manage ecosystem roles and verified business identities (KYB).</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Role Auditor */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-medium text-slate-800 mb-2">Role & Identity Auditor</h3>
          <p className="text-xs text-slate-500 mb-4">Inspect active permissions and registered business names for any wallet.</p>
          
          <div className="flex gap-2 mb-6">
            <input 
              placeholder="0x..." 
              value={checkAddress} 
              onChange={(e) => setCheckAddress(e.target.value)}
              className="flex-1 px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm font-mono"
            />
            <button 
              onClick={handleCheckRoles}
              disabled={isFetchingRoles}
              className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors text-sm font-medium"
            >
              {isFetchingRoles ? '...' : 'Audit'}
            </button>
          </div>

          {rolesData && (
            <div className="space-y-3 text-sm animate-fade-in">
              <div className="p-3 bg-white rounded-lg border border-slate-200 flex justify-between items-center">
                <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">Registered Identity</span>
                <span className="font-medium text-slate-800">{(rolesData[4].result as string) || 'Unregistered Entity'}</span>
              </div>

              <div className="space-y-2">
                <div className={`p-2.5 rounded-lg border text-xs flex justify-between items-center ${rolesData[0].result ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <span>🛡️ System Admin</span>
                  <span className="font-bold">{rolesData[0].result ? 'Active' : 'None'}</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-xs flex justify-between items-center ${rolesData[1].result ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <span>🏭 Manufacturer (Issuer)</span>
                  <span className="font-bold">{rolesData[1].result ? 'Active' : 'None'}</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-xs flex justify-between items-center ${rolesData[3].result ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <span>🏬 Authorized Dealer</span>
                  <span className="font-bold">{rolesData[3].result ? 'Active' : 'None'}</span>
                </div>
                <div className={`p-2.5 rounded-lg border text-xs flex justify-between items-center ${rolesData[2].result ? 'bg-purple-50 border-purple-200 text-purple-800' : 'bg-white border-slate-200 text-slate-500'}`}>
                  <span>🔧 Service Center</span>
                  <span className="font-bold">{rolesData[2].result ? 'Active' : 'None'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Role & Identity Manager */}
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
          <h3 className="text-lg font-medium text-slate-800 mb-4">On-Chain KYB Enrollment</h3>
          
          <form onSubmit={handleManageRole} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Target Wallet Address</label>
              <input 
                required 
                placeholder="0x..." 
                value={manageAddress} 
                onChange={(e) => setManageAddress(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Assign Role</label>
              <select 
                value={selectedRole} 
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
              >
                <option value={ISSUER_ROLE}>Issuer (Brand Manufacturer)</option>
                <option value={DEALER_ROLE}>Dealer (Authorized Retailer)</option>
                <option value={SERVICE_ROLE}>Service (Maintenance Center)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Action</label>
              <select 
                value={action} 
                onChange={(e) => setAction(e.target.value as 'grant' | 'revoke')}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
              >
                <option value="grant">Grant Role & Register Identity</option>
                <option value="revoke">Revoke Role & Clear Identity</option>
              </select>
            </div>

            {action === 'grant' && (
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Verified Company / Entity Name (KYB)</label>
                <input 
                  required 
                  placeholder="e.g. Rolex SA, Boutique Milano" 
                  value={companyName} 
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 text-sm"
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={isPending || isConfirming}
              className={`w-full py-3 mt-4 rounded-lg text-white font-medium text-sm transition-colors shadow-sm disabled:opacity-50 ${action === 'grant' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              {isPending || isConfirming ? 'Processing Transaction...' : action === 'grant' ? 'Grant Role & Register Identity' : 'Revoke Role & Clear Identity'}
            </button>
          </form>

          {isConfirming && <p className="text-amber-600 text-sm mt-4 text-center font-medium">⏳ Waiting for block confirmation...</p>}
          {isConfirmed && <p className="text-emerald-600 text-sm mt-4 text-center font-medium">🎉 Role operation successfully processed on-chain!</p>}
        </div>
      </div>
    </div>
  );
}