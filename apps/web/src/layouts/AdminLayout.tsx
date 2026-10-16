import React from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { BottomNav } from '../components/BottomNav';
import { useAuth } from '../context/AuthContext';

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

  return (
    <div className="min-h-screen flex flex-col bg-pdi-bg text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28">
        <Outlet />
      </main>

      {/* Admin Bottom Navigation Tabs */}
      <BottomNav />
    </div>
  );
};
