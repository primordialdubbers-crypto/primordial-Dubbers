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
  ChevronDown,
  Mic2,
  Zap,
  ShieldCheck,
  ClipboardList,
  Users,
  CheckSquare,
  FileCheck2,
  Scale,
  BookOpen
} from 'lucide-react';
import { Role } from '@pdi/shared';

export const Navbar: React.FC = () => {
  const { user, profile, logout, activeRole, setActiveRole } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = Boolean(user && (user.roles.includes('admin') || user.roles.includes('superadmin')));
  const isDirector = Boolean(user && (user.roles.includes('director') || isAdmin));

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
          <nav className="hidden md:flex items-center gap-4 lg:gap-5">
            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  className={`text-sm font-medium transition-colors hover:text-white flex items-center gap-1.5 ${
                    isCurrent('/admin') ? 'text-lime-sprout font-bold' : 'text-slate-300 hover:text-lime-sprout'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-lime-sprout" />
                  <span>Admin Panel</span>
                </Link>
                <Link
                  to="/director"
                  className={`text-sm font-medium transition-colors hover:text-white flex items-center gap-1.5 ${
                    isCurrent('/director') ? 'text-lime-sprout font-bold' : 'text-slate-300 hover:text-lime-sprout'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 text-lime-sprout" />
                  <span>Director Queue</span>
                </Link>
                <Link
                  to="/director/casting-board"
                  className={`text-sm font-medium transition-colors hover:text-white flex items-center gap-1.5 ${
                    isCurrent('/director/casting-board') ? 'text-lime-sprout font-bold' : 'text-slate-300 hover:text-lime-sprout'
                  }`}
                >
                  <Users className="w-4 h-4 text-lime-sprout" />
                  <span>Casting Queue</span>
                </Link>
                <Link
                  to="/admin/approvals"
                  className={`text-sm font-medium transition-colors hover:text-white flex items-center gap-1.5 ${
                    isCurrent('/admin/approvals') ? 'text-lime-sprout font-bold' : 'text-slate-300 hover:text-lime-sprout'
                  }`}
                >
                  <CheckSquare className="w-4 h-4 text-lime-sprout" />
                  <span>Approvals</span>
                </Link>
                <Link
                  to="/student/studio"
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isCurrent('/student/studio')
                      ? 'bg-lime-sprout text-slate-950 shadow-md shadow-lime-sprout/20'
                      : 'bg-fresh-canopy/80 text-lime-sprout border border-lime-sprout/40 hover:bg-lime-sprout hover:text-slate-950'
                  }`}
                >
                  <Mic2 className="w-3.5 h-3.5" /> Studio
                </Link>
              </>
            ) : isDirector ? (
              <>
                <Link
                  to="/director"
                  className={`text-sm font-medium transition-colors hover:text-white flex items-center gap-1.5 ${
                    isCurrent('/director') ? 'text-sky-400 font-bold' : 'text-slate-300 hover:text-sky-300'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 text-sky-400" />
                  <span>Director Queue</span>
                </Link>
                <Link
                  to="/director/casting-board"
                  className={`text-sm font-medium transition-colors hover:text-white flex items-center gap-1.5 ${
                    isCurrent('/director/casting-board') ? 'text-sky-400 font-bold' : 'text-slate-300 hover:text-sky-300'
                  }`}
                >
                  <Users className="w-4 h-4 text-sky-400" />
                  <span>Casting Queue</span>
                </Link>
                <Link
                  to="/student/studio"
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isCurrent('/student/studio')
                      ? 'bg-sky-400 text-slate-950 shadow-md shadow-sky-400/20'
                      : 'bg-sky-950/80 text-sky-300 border border-sky-400/40 hover:bg-sky-400 hover:text-slate-950'
                  }`}
                >
                  <Mic2 className="w-3.5 h-3.5" /> Studio
                </Link>
                <Link
                  to="/rules"
                  className={`text-sm font-medium transition-colors hover:text-white ${
                    isCurrent('/rules') ? 'text-sky-400 font-bold' : 'text-slate-300'
                  }`}
                >
                  Rules
                </Link>
              </>
            ) : user ? (
              <>
                <Link
                  to="/student"
                  className={`text-sm font-medium transition-colors hover:text-white ${
                    isCurrent('/student') ? 'text-cyber-lime font-bold' : 'text-slate-300'
                  }`}
                >
                  Home
                </Link>
                <Link
                  to="/student/studio"
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isCurrent('/student/studio')
                      ? 'bg-cyber-lime text-slate-950 shadow-md shadow-cyber-lime/20'
                      : 'bg-charcoal-violet/80 text-cyber-lime border border-cyber-lime/40 hover:bg-cyber-lime hover:text-slate-950'
                  }`}
                >
                  <Mic2 className="w-3.5 h-3.5" /> Dubbing Studio
                </Link>
                <Link
                  to="/student/submissions"
                  className={`text-sm font-medium transition-colors hover:text-white ${
                    isCurrent('/student/submissions') ? 'text-cyber-lime font-bold' : 'text-slate-300'
                  }`}
                >
                  My Takes
                </Link>
                <Link
                  to="/rules"
                  className={`text-sm font-medium transition-colors hover:text-white ${
                    isCurrent('/rules') ? 'text-cyber-lime font-bold' : 'text-slate-300'
                  }`}
                >
                  Rules
                </Link>
              </>
            ) : (
              <Link
                to="/rules"
                className={`text-sm font-medium transition-colors hover:text-white ${
                  isCurrent('/rules') ? 'text-cyber-lime font-bold' : 'text-slate-300'
                }`}
              >
                Rules & Rubric
              </Link>
            )}
          </nav>

          {/* Right Section: Auth & Role Preview Switcher */}
          <div className="hidden md:flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                <NotificationBell />
                {profile && (
                  <div className="flex items-center gap-2">
                    <RankBadge rank={profile.currentRank} size="sm" />
                    <span className="text-xs font-mono font-bold text-cyber-lime px-2 py-0.5 rounded bg-cyber-lime/10 border border-cyber-lime/30 hidden lg:inline-flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {profile.rankPoints.toLocaleString()} PTS
                    </span>
                  </div>
                )}

                {/* Role Switcher dropdown for multi-role testing */}
                {user.roles.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-pdi-border bg-pdi-surface text-slate-300 hover:text-white transition-colors"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>{activeRole}</span>
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

          {/* Mobile right items (Rank Badge + Bell + Hamburger) */}
          <div className="flex md:hidden items-center gap-2">
            {profile && <RankBadge rank={profile.currentRank} size="sm" />}
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

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-pdi-border bg-slate-950/98 px-5 pt-3 pb-6 space-y-3 shadow-2xl backdrop-blur-xl">
          {user && (
            <div className="pb-3 border-b border-pdi-border/80 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">{user.displayName}</p>
                <p className="text-xs text-slate-400 font-mono">{user.email}</p>
              </div>
              {profile && (
                <div className="flex items-center gap-2">
                  <RankBadge rank={profile.currentRank} size="sm" />
                  <span className="text-xs font-mono font-bold text-cyber-lime bg-cyber-lime/10 border border-cyber-lime/30 px-2 py-0.5 rounded">
                    {profile.rankPoints.toLocaleString()} PTS
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 text-xs font-medium">
            {isAdmin ? (
              <>
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-fresh-canopy/30 border border-lime-sprout/40 text-lime-sprout font-bold hover:bg-fresh-canopy/50 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4 text-lime-sprout shrink-0" />
                  <span>Admin Panel</span>
                </Link>
                <Link
                  to="/director"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-fresh-canopy/20 border border-lime-sprout/30 text-lime-sprout hover:bg-fresh-canopy/40 flex items-center gap-1.5"
                >
                  <ClipboardList className="w-4 h-4 text-lime-sprout shrink-0" />
                  <span>Director Queue</span>
                </Link>
                <Link
                  to="/director/casting-board"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-fresh-canopy/20 border border-lime-sprout/30 text-lime-sprout hover:bg-fresh-canopy/40 flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-lime-sprout shrink-0" />
                  <span>Casting Queue</span>
                </Link>
                <Link
                  to="/admin/approvals"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-fresh-canopy/20 border border-lime-sprout/30 text-lime-sprout hover:bg-fresh-canopy/40 flex items-center gap-1.5"
                >
                  <CheckSquare className="w-4 h-4 text-lime-sprout shrink-0" />
                  <span>Approvals</span>
                </Link>
                <Link
                  to="/student/studio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <Mic2 className="w-4 h-4 text-lime-sprout shrink-0" />
                  <span>Studio</span>
                </Link>
                <Link
                  to="/rules"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Rules</span>
                </Link>
              </>
            ) : isDirector ? (
              <>
                <Link
                  to="/director"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-sky-950/40 border border-sky-400/40 text-sky-300 font-bold hover:bg-sky-950/60 flex items-center gap-1.5"
                >
                  <ClipboardList className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Director Queue</span>
                </Link>
                <Link
                  to="/director/casting-board"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-sky-950/30 border border-sky-400/30 text-sky-300 hover:bg-sky-950/50 flex items-center gap-1.5"
                >
                  <Users className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Casting Queue</span>
                </Link>
                <Link
                  to="/student/studio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <Mic2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>Studio</span>
                </Link>
                <Link
                  to="/rules"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex items-center gap-1.5"
                >
                  <BookOpen className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Rules</span>
                </Link>
              </>
            ) : user ? (
              <>
                <Link
                  to="/student"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                >
                  🏠 Student Dashboard
                </Link>
                <Link
                  to="/student/studio"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-cyber-lime/10 border border-cyber-lime/40 text-cyber-lime font-bold hover:bg-cyber-lime/20 flex items-center gap-1.5"
                >
                  <Mic2 className="w-4 h-4 text-cyber-lime shrink-0" />
                  <span>Dubbing Studio</span>
                </Link>
                <Link
                  to="/student/submissions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                >
                  🎙️ My Takes & Dubs
                </Link>
                <Link
                  to="/student/ledger"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                >
                  ⚖️ Ledger & Appeals
                </Link>
                <Link
                  to="/student/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                >
                  👤 Voice Bio & Setup
                </Link>
                <Link
                  to="/rules"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
                >
                  📜 Rules & Rubrics
                </Link>
              </>
            ) : (
              <Link
                to="/rules"
                onClick={() => setMobileMenuOpen(false)}
                className="col-span-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-center"
              >
                📜 Rules & Scoring Rubrics
              </Link>
            )}
          </div>

          {user && user.roles.length > 1 && (
            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1.5">Switch Workspace:</span>
              <div className="flex gap-2">
                {user.roles.map((r: Role) => (
                  <button
                    key={r}
                    onClick={() => {
                      setActiveRole(r);
                      setMobileMenuOpen(false);
                      if (r === 'admin') navigate('/admin');
                      else if (r === 'director') navigate('/director');
                      else navigate('/student');
                    }}
                    className={`px-3 py-1 rounded text-xs capitalize border ${
                      activeRole === r
                        ? 'bg-cyber-lime text-slate-950 font-bold border-cyber-lime'
                        : 'bg-slate-900 text-slate-300 border-slate-800'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          {user ? (
            <div className="pt-3 border-t border-pdi-border flex items-center justify-between">
              <span className="text-[11px] text-slate-500 font-mono">PDI Mobile Experience</span>
              <button
                onClick={handleLogout}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out
              </button>
            </div>
          ) : (
            <div className="pt-3 border-t border-pdi-border flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 text-xs font-semibold border border-slate-700 rounded-lg text-slate-200 bg-slate-900"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="text-center py-2.5 text-xs rounded-lg bg-cyber-lime text-slate-950 font-bold shadow-md shadow-cyber-lime/20"
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
