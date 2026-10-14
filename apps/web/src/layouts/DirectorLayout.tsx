import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Award, Users } from 'lucide-react';

export const DirectorLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pdi-bg text-sky-400 font-mono">
        Validating Casting Director Credentials...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isDirectorOrAdmin =
    user.roles.includes('director') || user.roles.includes('admin') || user.roles.includes('superadmin');

  if (!isDirectorOrAdmin) {
    return <Navigate to="/forbidden" replace />;
  }

  const tabs = [
    { label: 'Assigned Review Queue', path: '/director', icon: ClipboardList },
    { label: 'Rubric Evaluations', path: '/director/evaluations', icon: Award },
    { label: 'Talent Casting Board', path: '/director/casting-board', icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-pdi-bg text-slate-100">
      <Navbar />

      {/* Director Sub-Navigation */}
      <div className="bg-sky-950/40 border-b border-sky-500/20 px-4 py-2 sticky top-16 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path;
            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-sky-500 text-black shadow-md shadow-sky-500/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-sky-950/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
};
