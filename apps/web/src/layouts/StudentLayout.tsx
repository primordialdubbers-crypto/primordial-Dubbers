import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Library, 
  Mic2, 
  FileCheck2, 
  ReceiptText, 
  UserCircle 
} from 'lucide-react';

export const StudentLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pdi-bg text-cyber-lime font-mono">
        Authenticating Voice Artist Session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const tabs = [
    { label: 'Overview', path: '/student', icon: LayoutDashboard },
    { label: 'Audition Library', path: '/student/auditions', icon: Library },
    { label: 'Dubbing Studio', path: '/student/studio', icon: Mic2 },
    { label: 'My Submissions', path: '/student/submissions', icon: FileCheck2 },
    { label: 'Ledger & Appeals', path: '/student/ledger', icon: ReceiptText },
    { label: 'Artist Profile', path: '/student/profile', icon: UserCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-pdi-bg text-slate-100">
      <Navbar />

      {/* Student Sub-Navigation Bar styled with Combo 03: Charcoal Violet & Cyber Lime */}
      <div className="bg-charcoal-violet/40 border-b border-cyber-lime/20 px-4 py-2 sticky top-16 z-40 backdrop-blur-md">
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
                    ? 'bg-cyber-lime text-black shadow-md shadow-cyber-lime/20 font-bold'
                    : 'text-slate-300 hover:text-white hover:bg-charcoal-violet/60'
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
