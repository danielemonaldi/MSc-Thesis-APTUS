'use client';

export default function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 bg-white rounded-2xl shadow-sm border border-slate-100 mt-10">
      <h2 className="text-4xl font-light text-slate-900 tracking-tight mb-4">
        Welcome to APTUS
      </h2>
      <p className="text-lg text-slate-500 max-w-lg text-center mb-8 font-light">
        The next-generation Digital Passport for luxury watches. Connect your Web3 wallet to access your secure ecosystem.
      </p>
      
      {/* Decorative luxury line */}
      <div className="w-16 h-px bg-slate-300"></div>
    </div>
  );
}