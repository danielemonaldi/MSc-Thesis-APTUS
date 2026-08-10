'use client';

export default function WelcomeScreen() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 2rem', backgroundColor: '#f8fafc', borderRadius: '16px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h2 style={{ fontSize: '2.5rem', color: '#0f172a', marginBottom: '1rem' }}>Welcome to APTUS</h2>
      <p style={{ fontSize: '1.2rem', color: '#475569', maxWidth: '500px', margin: '0 auto 2rem auto' }}>
        The next-generation Digital Passport for luxury watches. Connect your Web3 wallet to access your secure ecosystem.
      </p>
    </div>
  );
}