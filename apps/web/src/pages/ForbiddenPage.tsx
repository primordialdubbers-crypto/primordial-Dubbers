import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const ForbiddenPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pdi-bg px-4">
      <div className="max-w-md w-full p-8 rounded-2xl border border-rose-500/40 bg-pdi-surface text-center shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/80 border border-rose-500 text-rose-400 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold font-heading text-white mb-2">403 — ACCESS FORBIDDEN</h1>
        <p className="text-xs text-slate-300 leading-relaxed mb-6">
          Your account does not possess the required role permissions to view this workspace. Role-based access control (RBAC) is enforced server-side.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Safety</span>
        </Link>
      </div>
    </div>
  );
};

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pdi-bg px-4">
      <div className="max-w-md w-full p-8 rounded-2xl border border-pdi-border bg-pdi-surface text-center shadow-2xl">
        <h1 className="text-4xl font-extrabold font-heading text-cyber-lime mb-2">404</h1>
        <h2 className="text-lg font-bold font-heading text-white mb-2">PAGE NOT FOUND</h2>
        <p className="text-xs text-slate-400 mb-6">The requested resource does not exist on this server.</p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-cyber-lime text-black font-semibold text-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
};
