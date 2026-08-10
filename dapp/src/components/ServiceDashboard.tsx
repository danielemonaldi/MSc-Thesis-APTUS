'use client';

export default function ServiceDashboard({ address }: { address: string | undefined }) {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#fefce8', borderRadius: '12px', border: '1px solid #fef08a' }}>
      <h2 style={{ color: '#854d0e' }}>Service Center Dashboard</h2>
      <p style={{ color: '#ca8a04', marginTop: '0.5rem', fontSize: '0.9rem' }}>Technician Wallet: {address}</p>
      <div style={{ marginTop: '2rem', padding: '2rem', backgroundColor: 'white', borderRadius: '8px' }}>
        <p style={{ color: '#64748b', textAlign: 'center' }}>Maintenance module coming soon...</p>
      </div>
    </div>
  );
}