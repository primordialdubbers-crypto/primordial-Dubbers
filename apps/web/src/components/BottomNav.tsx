import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Sparkles, 
  Mic2, 
  Users, 
  ClipboardList, 
  ShieldCheck, 
  Trophy, 
  BookOpen, 
  User, 
  CheckSquare,
  X,
  ChevronRight
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { user, activeRole } = useAuth();
  const location = useLocation();
  const [adminDrawerOpen, setAdminDrawerOpen] = useState(false);
  const [directorDrawerOpen, setDirectorDrawerOpen] = useState(false);

  useEffect(() => {
    setAdminDrawerOpen(false);
    setDirectorDrawerOpen(false);
  }, [location.pathname]);

  const isCurrent = (path: string) => {
    if (path === '/student' || path === '/director' || path === '/admin' || path === '/') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const isAdmin = Boolean(user && (user.roles.includes('admin') || user.roles.includes('superadmin')));
  const isDirector = Boolean(user && (user.roles.includes('director') || isAdmin));

  // 1. Admin Bottom Navigation with Interactive Admin Drawer
  if (user && (activeRole === 'admin' || isAdmin)) {
    const tabs = [
      { label: 'Home', path: '/student', icon: Home },
      { label: 'Admin', isAction: true, action: () => setAdminDrawerOpen(true), icon: ShieldCheck },
      { label: 'Studio', path: '/student/studio', icon: Mic2, isHero: true },
      { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { label: 'Profile', path: '/student/profile', icon: User },
    ];

    const isManagementActive = location.pathname.startsWith('/admin') || location.pathname.startsWith('/director');

    return (
      <>
        {/* Admin Quick Management Drawer Modal */}
        {adminDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="fixed inset-0" 
              onClick={() => setAdminDrawerOpen(false)} 
            />
            <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-950 border-t-2 border-lime-sprout/50 rounded-t-2xl shadow-2xl p-4 pb-8 space-y-3 animate-in slide-in-from-bottom duration-250">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-fresh-canopy/40 border border-lime-sprout/40 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-lime-sprout" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-heading tracking-wide">ADMIN OPERATIONS</h3>
                    <p className="text-[10px] text-slate-400">Authoritative Governance Desk</p>
                  </div>
                </div>
                <button 
                  onClick={() => setAdminDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <Link
                  to="/admin"
                  onClick={() => setAdminDrawerOpen(false)}
                  className="p-3 rounded-xl bg-fresh-canopy/20 border border-lime-sprout/30 hover:bg-fresh-canopy/40 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="w-5 h-5 text-lime-sprout shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-lime-sprout transition-colors">Admin Panel</p>
                      <p className="text-[10px] text-slate-400">Direct Points Console, User Management & Audit</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-lime-sprout opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  to="/director"
                  onClick={() => setAdminDrawerOpen(false)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-lime-sprout shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-lime-sprout transition-colors">Director Queue</p>
                      <p className="text-[10px] text-slate-400">Audition Rubric Reviews & Point Recommendations</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  to="/director/casting-board"
                  onClick={() => setAdminDrawerOpen(false)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-lime-sprout shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-lime-sprout transition-colors">Casting Queue</p>
                      <p className="text-[10px] text-slate-400">Filter talent by rank, voice type, languages & dubs</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  to="/admin/approvals"
                  onClick={() => setAdminDrawerOpen(false)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <CheckSquare className="w-5 h-5 text-lime-sprout shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-lime-sprout transition-colors">Approvals</p>
                      <p className="text-[10px] text-slate-400">Point approvals & sensitive deduction approvals</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  to="/student/studio"
                  onClick={() => setAdminDrawerOpen(false)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Mic2 className="w-5 h-5 text-lime-sprout shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-lime-sprout transition-colors">Studio</p>
                      <p className="text-[10px] text-slate-400">Dubbing workspace & vocal take testing</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Nav Bar */}
        <nav 
          aria-label="Admin Bottom Navigation" 
          className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-lime-900/40 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
        >
          <div className="max-w-lg md:max-w-xl mx-auto flex items-center justify-around px-2 py-1.5 sm:py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              if (tab.isHero) {
                const active = isCurrent(tab.path!);
                return (
                  <Link
                    key={tab.label}
                    to={tab.path!}
                    className="flex flex-col items-center -mt-6 group focus:outline-none"
                  >
                    <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-all transform group-hover:scale-105 group-active:scale-95 ${
                      active 
                        ? 'bg-lime-sprout text-slate-950 ring-4 ring-lime-sprout/30 shadow-lime-sprout/40' 
                        : 'bg-fresh-canopy border-2 border-lime-sprout text-lime-sprout shadow-lime-sprout/20 hover:bg-lime-sprout hover:text-slate-950'
                    }`}>
                      <Icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <span className={`text-[10px] font-heading tracking-wider mt-1 font-bold ${
                      active ? 'text-lime-sprout' : 'text-slate-300 group-hover:text-lime-sprout'
                    }`}>
                      {tab.label}
                    </span>
                  </Link>
                );
              }

              if (tab.isAction) {
                const active = adminDrawerOpen || isManagementActive;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={tab.action}
                    className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all focus:outline-none ${
                      active 
                        ? 'text-lime-sprout scale-105' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="relative">
                      <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                      {active && (
                        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-lime-sprout animate-pulse" />
                      )}
                    </div>
                    <span className={`text-[10px] mt-1 font-medium tracking-tight ${
                      active ? 'font-bold text-lime-sprout' : 'text-slate-400'
                    }`}>
                      {tab.label}
                    </span>
                  </button>
                );
              }

              const active = isCurrent(tab.path!);
              return (
                <Link
                  key={tab.label}
                  to={tab.path!}
                  className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all focus:outline-none ${
                    active 
                      ? 'text-lime-sprout scale-105' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                    {active && (
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-lime-sprout animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium tracking-tight ${
                    active ? 'font-bold text-lime-sprout' : 'text-slate-400'
                  }`}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  // 2. Casting Director Bottom Navigation with Director Drawer
  if (user && activeRole === 'director') {
    const tabs = [
      { label: 'Home', path: '/student', icon: Home },
      { label: 'Director', isAction: true, action: () => setDirectorDrawerOpen(true), icon: ClipboardList },
      { label: 'Studio', path: '/student/studio', icon: Mic2, isHero: true },
      { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { label: 'Profile', path: '/student/profile', icon: User },
    ];

    const isDirectorActive = location.pathname.startsWith('/director');

    return (
      <>
        {directorDrawerOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
              className="fixed inset-0" 
              onClick={() => setDirectorDrawerOpen(false)} 
            />
            <div className="relative z-10 w-full max-w-lg mx-auto bg-slate-950 border-t-2 border-sky-400/50 rounded-t-2xl shadow-2xl p-4 pb-8 space-y-3 animate-in slide-in-from-bottom duration-250">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-950/60 border border-sky-400/40 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-sky-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-heading tracking-wide">DIRECTOR WORKSPACE</h3>
                    <p className="text-[10px] text-slate-400">Audition Reviews & Casting Talent</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDirectorDrawerOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 pt-1">
                <Link
                  to="/director"
                  onClick={() => setDirectorDrawerOpen(false)}
                  className="p-3 rounded-xl bg-sky-950/30 border border-sky-400/30 hover:bg-sky-950/50 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">Director Queue</p>
                      <p className="text-[10px] text-slate-400">Audition Rubric Scoring & Recommendations</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-sky-400 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  to="/director/casting-board"
                  onClick={() => setDirectorDrawerOpen(false)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">Casting Queue</p>
                      <p className="text-[10px] text-slate-400">Filter talent by rank, voice type & dubs</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  to="/student/studio"
                  onClick={() => setDirectorDrawerOpen(false)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Mic2 className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">Studio</p>
                      <p className="text-[10px] text-slate-400">Voice recording studio</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>

                <Link
                  to="/rules"
                  onClick={() => setDirectorDrawerOpen(false)}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-sky-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">Rules</p>
                      <p className="text-[10px] text-slate-400">Scoring rubrics & rank policy</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-0.5 transition-all" />
                </Link>
              </div>
            </div>
          </div>
        )}

        <nav 
          aria-label="Director Bottom Navigation" 
          className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-sky-900/50 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
        >
          <div className="max-w-lg md:max-w-xl mx-auto flex items-center justify-around px-2 py-1.5 sm:py-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              if (tab.isHero) {
                const active = isCurrent(tab.path!);
                return (
                  <Link
                    key={tab.label}
                    to={tab.path!}
                    className="flex flex-col items-center -mt-6 group focus:outline-none"
                  >
                    <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-all transform group-hover:scale-105 group-active:scale-95 ${
                      active 
                        ? 'bg-sky-400 text-slate-950 ring-4 ring-sky-400/30 shadow-sky-400/40' 
                        : 'bg-sky-950 border-2 border-sky-400 text-sky-400 shadow-sky-400/20 hover:bg-sky-400 hover:text-slate-950'
                    }`}>
                      <Icon className="w-6 h-6 stroke-[2.5]" />
                    </div>
                    <span className={`text-[10px] font-heading tracking-wider mt-1 font-bold ${
                      active ? 'text-sky-400' : 'text-slate-300 group-hover:text-sky-400'
                    }`}>
                      {tab.label}
                    </span>
                  </Link>
                );
              }

              if (tab.isAction) {
                const active = directorDrawerOpen || isDirectorActive;
                return (
                  <button
                    key={tab.label}
                    type="button"
                    onClick={tab.action}
                    className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all focus:outline-none ${
                      active 
                        ? 'text-sky-400 scale-105' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <div className="relative">
                      <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                      {active && (
                        <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                      )}
                    </div>
                    <span className={`text-[10px] mt-1 font-medium tracking-tight ${
                      active ? 'font-bold text-sky-400' : 'text-slate-400'
                    }`}>
                      {tab.label}
                    </span>
                  </button>
                );
              }

              const active = isCurrent(tab.path!);
              return (
                <Link
                  key={tab.label}
                  to={tab.path!}
                  className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all focus:outline-none ${
                    active 
                      ? 'text-sky-400 scale-105' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="relative">
                    <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                    {active && (
                      <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
                    )}
                  </div>
                  <span className={`text-[10px] mt-1 font-medium tracking-tight ${
                    active ? 'font-bold text-sky-400' : 'text-slate-400'
                  }`}>
                    {tab.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </>
    );
  }

  // 3. Voice Artist / Student Tabs (Default Logged In User)
  // Exactly: Home • Auditions • Studio (Center Hero) • Leaderboard • Profile
  if (user) {
    const tabs = [
      { label: 'Home', path: '/student', icon: Home },
      { label: 'Auditions', path: '/student/auditions', icon: Sparkles },
      { label: 'Studio', path: '/student/studio', icon: Mic2, isHero: true },
      { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { label: 'Profile', path: '/student/profile', icon: User },
    ];

    return (
      <nav 
        aria-label="Student Bottom Navigation" 
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
      >
        <div className="max-w-lg md:max-w-xl mx-auto flex items-center justify-around px-2 py-1.5 sm:py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isCurrent(tab.path);

            if (tab.isHero) {
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className="flex flex-col items-center -mt-6 group focus:outline-none"
                >
                  <div className={`w-13 h-13 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shadow-lg transition-all transform group-hover:scale-105 group-active:scale-95 ${
                    active 
                      ? 'bg-cyber-lime text-slate-950 ring-4 ring-cyber-lime/30 shadow-cyber-lime/40' 
                      : 'bg-charcoal-violet border-2 border-cyber-lime text-cyber-lime shadow-cyber-lime/20 hover:bg-cyber-lime hover:text-slate-950'
                  }`}>
                    <Icon className="w-6 h-6 stroke-[2.5]" />
                  </div>
                  <span className={`text-[10px] font-heading tracking-wider mt-1 font-bold ${
                    active ? 'text-cyber-lime' : 'text-slate-300 group-hover:text-cyber-lime'
                  }`}>
                    {tab.label}
                  </span>
                </Link>
              );
            }

            return (
              <Link
                key={tab.path}
                to={tab.path}
                className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all focus:outline-none ${
                  active 
                    ? 'text-cyber-lime scale-105' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                  {active && (
                    <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-cyber-lime animate-pulse" />
                  )}
                </div>
                <span className={`text-[10px] mt-1 font-medium tracking-tight ${
                  active ? 'font-bold text-cyber-lime' : 'text-slate-400'
                }`}>
                  {tab.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    );
  }

  // 4. Guest / Public Visitors (Not logged in)
  const guestTabs = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Auditions', path: '/challenges', icon: Sparkles },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Rank Rules', path: '/rules', icon: BookOpen },
    { label: 'Profile', path: '/login', icon: User },
  ];

  return (
    <nav 
      aria-label="Public Bottom Navigation" 
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
    >
      <div className="max-w-lg md:max-w-xl mx-auto flex items-center justify-around px-2 py-1.5 sm:py-2">
        {guestTabs.map((tab) => {
          const Icon = tab.icon;
          const active = isCurrent(tab.path);

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all focus:outline-none ${
                active 
                  ? 'text-cyber-lime scale-105' 
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {active && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-cyber-lime animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] mt-1 font-medium tracking-tight ${
                active ? 'font-bold text-cyber-lime' : 'text-slate-400'
              }`}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
