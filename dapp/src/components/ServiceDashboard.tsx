'use client';

export default function ServiceDashboard({ address }: { address: string | undefined }) {
  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-100">
        <div>
          <h2 className="text-2xl font-light text-slate-900 mb-1">Service Center</h2>
          <p className="text-slate-500 font-light text-sm">Authorized Maintenance Portal</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">Technician ID</p>
          <p className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600 mt-1">{address}</p>
        </div>
      </div>
      
      <div className="py-12 bg-slate-50 rounded-xl border border-slate-200 border-dashed text-center">
        <span className="text-4xl mb-4 block">🔧</span>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Maintenance Module</h3>
        <p className="text-slate-500 text-sm">We will implement the service history updates here.</p>
      </div>
    </div>
  );
}