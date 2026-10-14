import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from '../components/Navbar';

export const PublicLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-pdi-bg text-slate-100">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <footer className="border-t border-pdi-border/60 py-8 px-4 bg-slate-950/70 text-center text-xs text-slate-500 flex flex-col items-center gap-3">
        <img
          src="/pdi-logo.jpg"
          alt="Primordial Dubbers India Logo"
          className="w-10 h-10 rounded-lg object-contain bg-black border border-slate-800 p-1"
        />
        <div>
          <p className="font-heading tracking-widest text-slate-400 mb-1">
            PRIMORDIAL DUBBERS INDIA — VOICES BUILD STORIES
          </p>
          <p>© 2026 PDI Voice Artist Ranking Platform. Server-authoritative points & audited rank ledger.</p>
        </div>
      </footer>
    </div>
  );
};
