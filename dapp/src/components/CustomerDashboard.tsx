'use client';

export default function CustomerDashboard({ address }: { address: string | undefined }) {
  return (
    <div style={{ padding: '2rem', backgroundColor: '#eff6ff', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
      <h2 style={{ color: '#1e3a8a' }}>Customer Portal</h2>
      <p style={{ color: '#3b82f6', marginTop: '0.5rem', fontSize: '0.9rem' }}>Connected Wallet: {address}</p>
      <div style={{ marginTop: '2rem', padding: '2rem', backgroundColor: 'white', borderRadius: '8px', textAlign: 'center' }}>
        <p style={{ color: '#64748b' }}>No watches found in your collection.</p>
      </div>
    </div>
  );
}