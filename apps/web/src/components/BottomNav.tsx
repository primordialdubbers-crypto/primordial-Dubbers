import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Home, 
  Sparkles, 
  Mic2, 
  FileCheck2, 
  Award, 
  Users, 
  ClipboardList, 
  ShieldCheck, 
  Trophy, 
  BookOpen, 
  User, 
  CheckSquare 
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const { user, activeRole } = useAuth();
  const location = useLocation();

  const isCurrent = (path: string) => {
    if (path === '/student' || path === '/director' || path === '/admin' || path === '/') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // 1. Voice Artist / Student Tabs (Default Logged In User)
  if (user && activeRole === 'student') {
    const tabs = [
      { label: 'Home', path: '/student', icon: Home },
      { label: 'Auditions', path: '/student/auditions', icon: Sparkles },
      { label: 'Studio', path: '/student/studio', icon: Mic2, isHero: true },
      { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
      { label: 'Profile', path: '/student/profile', icon: User },
    ];

    return (
      <nav 
        aria-label="Bottom Navigation" 
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

  // 2. Casting Director Tabs
  if (user && activeRole === 'director') {
    const tabs = [
      { label: 'Review Queue', path: '/director', icon: ClipboardList },
      { label: 'Talent Board', path: '/director/casting-board', icon: Users },
      { label: 'Studio', path: '/student/studio', icon: Mic2, isHero: true },
      { label: 'Auditions', path: '/challenges', icon: Sparkles },
      { label: 'Profile', path: '/student/profile', icon: Award },
    ];

    return (
      <nav 
        aria-label="Director Bottom Navigation" 
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-sky-900/50 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
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

            return (
              <Link
                key={tab.path}
                to={tab.path}
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
    );
  }

  // 3. Admin Tabs
  if (user && activeRole === 'admin') {
    const tabs = [
      { label: 'Admin Hub', path: '/admin', icon: ShieldCheck },
      { label: 'Users', path: '/admin/users', icon: Users },
      { label: 'Studio', path: '/student/studio', icon: Mic2, isHero: true },
      { label: 'Approvals', path: '/admin/approvals', icon: CheckSquare },
      { label: 'Profile', path: '/student/profile', icon: User },
    ];

    return (
      <nav 
        aria-label="Admin Bottom Navigation" 
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-lime-800/50 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
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

            return (
              <Link
                key={tab.path}
                to={tab.path}
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
