import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicLayout } from './layouts/PublicLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { DirectorLayout } from './layouts/DirectorLayout';
import { AdminLayout } from './layouts/AdminLayout';

import { LandingPage } from './pages/LandingPage';
import { RankRulesPage } from './pages/RankRulesPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { PointsLedgerPage } from './pages/PointsLedgerPage';
import { ArtistProfilePage } from './pages/ArtistProfilePage';
import { PublicArtistProfilePage } from './pages/PublicArtistProfilePage';
import { DirectorWorkspace } from './pages/DirectorWorkspace';
import { AdminOverview } from './pages/AdminOverview';
import { ChallengesPage } from './pages/ChallengesPage';
import { SubmissionsPage } from './pages/SubmissionsPage';
import { StudioPage } from './pages/StudioPage';
import { ApprovalQueuePage } from './pages/ApprovalQueuePage';
import { CastingBoardPage } from './pages/CastingBoardPage';
import { UserManagementPage } from './pages/UserManagementPage';
import { ForbiddenPage, NotFoundPage } from './pages/ForbiddenPage';
import { MobileBridge } from './components/MobileBridge';

function RoadmapPlaceholder({ title, phase, description }: { title: string; phase: string; description: string }) {
  return (
    <div className="rounded-xl border border-pdi-border bg-pdi-surface p-8 text-center max-w-2xl mx-auto my-8 shadow-xl">
      <span className="px-2.5 py-1 rounded bg-slate-800 text-[11px] font-mono uppercase text-cyber-lime border border-slate-700">
        Roadmap: {phase}
      </span>
      <h2 className="text-xl font-bold font-heading text-white mt-4 mb-2">{title}</h2>
      <p className="text-xs text-slate-400 mb-6 leading-relaxed">{description}</p>
      <Link
        to="/"
        className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 transition-colors"
      >
        Return to Overview
      </Link>
    </div>
  );
}

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <MobileBridge />
        <Routes>
          {/* Public Visitor Routes */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<LandingPage />} />
            <Route path="rules" element={<RankRulesPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="challenges" element={<ChallengesPage />} />
            <Route path="artists/:userId" element={<PublicArtistProfilePage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="register" element={<RegisterPage />} />
          </Route>

          {/* Student Protected Routes (Theme: Combo 03 Charcoal Violet & Cyber Lime) */}
          <Route path="/student" element={<StudentLayout />}>
            <Route index element={<StudentDashboard />} />
            <Route path="auditions" element={<ChallengesPage />} />
            <Route path="studio" element={<StudioPage />} />
            <Route path="studio/:challengeId" element={<StudioPage />} />
            <Route path="submissions" element={<SubmissionsPage />} />
            <Route path="ledger" element={<PointsLedgerPage />} />
            <Route path="profile" element={<ArtistProfilePage />} />
          </Route>


          {/* Casting Director Protected Routes */}
          <Route path="/director" element={<DirectorLayout />}>
            <Route index element={<DirectorWorkspace />} />
            <Route path="evaluations" element={<DirectorWorkspace />} />
            <Route path="evaluate/:submissionId" element={<DirectorWorkspace />} />
            <Route path="casting-board" element={<CastingBoardPage />} />
          </Route>

          {/* Admin Protected Routes (Theme: Combo 05 Fresh Canopy & Lime Sprout) */}
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<UserManagementPage />} />
            <Route
              path="approvals"
              element={<ApprovalQueuePage />}
            />
            <Route
              path="settings"
              element={
                <RoadmapPlaceholder
                  title="Rank Rules & Points Catalog Settings"
                  phase="Phase 3"
                  description="Admin-configurable award catalogs, deduction categories, and rank threshold parameters."
                />
              }
            />
            <Route
              path="audit"
              element={
                <RoadmapPlaceholder
                  title="System Security & Audit Trail"
                  phase="Phase 3"
                  description="Cryptographically auditable log of all administrative actions, proposal decisions, and ledger mutations."
                />
              }
            />
          </Route>

          {/* System & Fallback Routes */}
          <Route path="/forbidden" element={<ForbiddenPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
