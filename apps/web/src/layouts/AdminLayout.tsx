import React from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  Users, 
  CheckSquare, 
  Settings, 
  History 
} from 'lucide-react';

export const AdminLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pdi-bg text-lime-sprout font-mono">
        Authorizing Security Clearance...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isAdmin = user.roles.includes('admin') || user.roles.includes('superadmin');
  if (!isAdmin) {
    return <Navigate to="/forbidden" replace />;
  }

  const tabs = [
    { label: 'Executive Overview', path: '/admin', icon: ShieldCheck },
    { label: 'User Management', path: '/admin/users', icon: Users },
    { label: 'Approval Queue', path: '/admin/approvals', icon: CheckSquare },
    { label: 'Rank Rules & Catalog', path: '/admin/settings', icon: Settings },
    { label: 'Audit Trail', path: '/admin/audit', icon: History },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-pdi-bg text-slate-100">
      <Navbar />

      {/* Admin Sub-Navigation styled with Combo 05: Fresh Canopy & Lime Sprout */}
      <div className="bg-fresh-canopy/50 border-b border-lime-sprout/20 px-4 py-2 sticky top-16 z-40 backdrop-blur-md">
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
                    ? 'bg-lime-sprout text-fresh-canopy font-bold shadow-md shadow-lime-sprout/20'
                    : 'text-slate-300 hover:text-white hover:bg-fresh-canopy'
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
