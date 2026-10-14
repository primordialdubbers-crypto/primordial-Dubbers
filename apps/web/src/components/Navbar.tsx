import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { RankBadge } from './RankBadge';
import { NotificationBell } from './NotificationBell';
import { 
  Menu, 
  X, 
  LogOut, 
  SlidersHorizontal,
  ChevronDown 
} from 'lucide-react';
import { Role } from '@pdi/shared';

export const Navbar: React.FC = () => {
  const { user, profile, logout, activeRole, setActiveRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isCurrent = (path: string) => location.pathname === path;

  // Header styles based on role theme
  const getHeaderTheme = () => {
    if (activeRole === 'admin') {
      return 'border-lime-sprout/20 bg-slate-950/90 shadow-lime-sprout/5';
    }
    if (activeRole === 'student') {
      return 'border-cyber-lime/20 bg-slate-950/90 shadow-cyber-lime/5';
    }
    return 'border-pdi-border bg-pdi-bg/95';
  };

  return (
    <header className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${getHeaderTheme()}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src="/pdi-logo.jpg"
                alt="Primordial Dubbers India Logo"
                className="w-10 h-10 rounded-lg object-contain bg-black border border-slate-700/80 shadow-md shadow-pdi-blue/20 group-hover:scale-105 transition-transform"
              />
              <div className="flex flex-col">
                <span className="font-heading text-lg font-bold tracking-wider text-white group-hover:text-cyber-lime transition-colors">
                  PRIMORDIAL DUBBERS
                </span>
                <span className="text-[10px] tracking-widest text-slate-400 font-mono -mt-1">
                  INDIA RANKING SYSTEM
                </span>
              </div>
            </Link>

            {/* Role indicator tag */}
            {user && (
              <span className={`hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono uppercase tracking-wider ${
                activeRole === 'admin'
                  ? 'bg-fresh-canopy text-lime-sprout border border-lime-sprout/40'
                  : activeRole === 'director'
                  ? 'bg-sky-950 text-sky-300 border border-sky-500/40'
                  : 'bg-charcoal-violet text-cyber-lime border border-cyber-lime/40'
              }`}>
                {activeRole} view
              </span>
            )}
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              to="/rules"
              className={`text-sm font-medium transition-colors hover:text-white ${
                isCurrent('/rules') ? 'text-cyber-lime' : 'text-slate-300'
              }`}
            >
              Rules & Rubric
            </Link>
            <Link
              to="/challenges"
              className={`text-sm font-medium transition-colors hover:text-white ${
                isCurrent('/challenges') ? 'text-cyber-lime' : 'text-slate-300'
              }`}
            >
              Audition Challenges
            </Link>
            <Link
              to="/leaderboard"
              className={`text-sm font-medium transition-colors hover:text-white ${
                isCurrent('/leaderboard') ? 'text-cyber-lime' : 'text-slate-300'
              }`}
            >
              Leaderboard
            </Link>

            {/* Role-Specific Shortcuts */}
            {user && (
              <>
                <Link
                  to="/student"
                  className={`text-sm font-medium transition-colors hover:text-cyber-lime ${
                    location.pathname.startsWith('/student') ? 'text-cyber-lime underline' : 'text-slate-300'
                  }`}
                >
                  Student Hub
                </Link>
                {(user.roles.includes('director') || user.roles.includes('admin') || user.roles.includes('superadmin')) && (
                  <>
                    <Link
                      to="/director"
                      className={`text-sm font-medium transition-colors hover:text-sky-300 ${
                        location.pathname === '/director' || location.pathname.startsWith('/director/evaluate') ? 'text-sky-300 underline' : 'text-slate-300'
                      }`}
                    >
                      Director Queue
                    </Link>
                    <Link
                      to="/director/casting-board"
                      className={`text-sm font-medium transition-colors hover:text-sky-300 ${
                        location.pathname.startsWith('/director/casting-board') ? 'text-sky-300 underline' : 'text-slate-300'
                      }`}
                    >
                      Casting Board
                    </Link>
                  </>
                )}
                {(user.roles.includes('admin') || user.roles.includes('superadmin')) && (
                  <Link
                    to="/admin"
                    className={`text-sm font-medium transition-colors hover:text-lime-sprout ${
                      location.pathname.startsWith('/admin') ? 'text-lime-sprout underline' : 'text-slate-300'
                    }`}
                  >
                    Admin Panel
                  </Link>
                )}
              </>
            )}
          </nav>

          {/* Right Section: Auth & Role Preview Switcher */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                {profile && <RankBadge rank={profile.currentRank} size="sm" />}

                {/* Role Switcher dropdown for multi-role testing */}
                {user.roles.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-pdi-border bg-pdi-surface text-slate-300 hover:text-white transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Switch: {activeRole}</span>
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {roleDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-36 py-1 bg-pdi-surface border border-pdi-border rounded-lg shadow-xl z-50">
                        {user.roles.map((r: Role) => (
                          <button
                            key={r}
                            onClick={() => {
                              setActiveRole(r);
                              setRoleDropdownOpen(false);
                              if (r === 'admin') navigate('/admin');
                              else if (r === 'director') navigate('/director');
                              else navigate('/student');
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs capitalize hover:bg-slate-800 ${
                              activeRole === r ? 'text-cyber-lime font-bold' : 'text-slate-300'
                            }`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 pl-2 border-l border-pdi-border">
                  <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 text-xs font-semibold text-slate-200">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-medium text-slate-200">{user.displayName}</span>
                    <span className="text-[10px] text-slate-400 capitalize">{user.roles.join(', ')}</span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors ml-1"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="px-4 py-1.5 text-sm font-medium text-slate-200 hover:text-white transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm font-semibold rounded-md bg-cyber-lime text-black hover:bg-lime-400 transition-all shadow-md shadow-cyber-lime/20"
                >
                  Join Academy
                </Link>
              </div>
            )}
          </div>

          {/* Mobile right items (Bell + Hamburger) */}
          <div className="flex md:hidden items-center gap-2">
            {user && <NotificationBell />}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 text-slate-300 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-pdi-border bg-pdi-bg/95 px-4 pt-2 pb-4 space-y-2">
          <Link
            to="/rules"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-300 hover:text-white"
          >
            Rules & Rubric
          </Link>
          <Link
            to="/challenges"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-300 hover:text-white"
          >
            Audition Challenges
          </Link>
          <Link
            to="/leaderboard"
            onClick={() => setMobileMenuOpen(false)}
            className="block py-2 text-sm text-slate-300 hover:text-white"
          >
            Leaderboard
          </Link>
          {user ? (
            <>
              <Link
                to="/student"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-sm text-cyber-lime"
              >
                Student Hub
              </Link>
              {(user.roles.includes('director') || user.roles.includes('admin') || user.roles.includes('superadmin')) && (
                <>
                  <Link
                    to="/director"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-sm text-sky-400"
                  >
                    Director Queue
                  </Link>
                  <Link
                    to="/director/casting-board"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block py-2 text-sm text-sky-300"
                  >
                    Talent Casting Board
                  </Link>
                </>
              )}
              {(user.roles.includes('admin') || user.roles.includes('superadmin')) && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 text-sm text-lime-sprout"
                >
                  Admin Panel
                </Link>
              )}
              <div className="pt-3 border-t border-pdi-border flex items-center justify-between">
                <span className="text-xs text-slate-400">{user.email}</span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-rose-400 flex items-center gap-1"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="pt-3 border-t border-pdi-border flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-sm border border-slate-700 rounded-md text-slate-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2 text-sm rounded-md bg-cyber-lime text-black font-semibold"
              >
                Join Academy
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
