import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { RankBadge } from '../components/RankBadge';
import { AdminUserRecord } from '@pdi/shared';
import {
  Users,
  Search,
  Trash2,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  ShieldAlert,
  UserX,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';

export const UserManagementPage: React.FC = () => {
  const { user, token } = useAuth();
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Deletion Confirmation Modal State
  const [userToDelete, setUserToDelete] = useState<AdminUserRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Password Reset Modal State
  const [userToResetPassword, setUserToResetPassword] = useState<AdminUserRecord | null>(null);
  const [adminNewPassword, setAdminNewPassword] = useState<string>('');
  const [isResettingPassword, setIsResettingPassword] = useState<boolean>(false);

  // Status Update State
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      let url = `/api/v1/admin/users?page=${page}&limit=12`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      if (roleFilter !== 'all') url += `&role=${encodeURIComponent(roleFilter)}`;
      if (statusFilter !== 'all') url += `&status=${encodeURIComponent(statusFilter)}`;

      const res = await fetch(url, { headers, credentials: 'include' });
      if (res.ok) {
        const body = await res.json();
        setUsers(body.data?.users || []);
        if (body.data?.pagination) {
          setTotalPages(body.data.pagination.totalPages || 1);
          setTotalCount(body.data.pagination.total || 0);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch user list:', err);
      setFeedback({ type: 'error', message: 'Network error loading user accounts.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter, token]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/users/${userToDelete.id}`, {
        method: 'DELETE',
        headers,
        credentials: 'include',
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || 'Failed to delete user');
      }

      setFeedback({
        type: 'success',
        message: body.message || `User "${userToDelete.displayName}" deleted successfully.`,
      });
      setUserToDelete(null);
      fetchUsers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error occurred while deleting user.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleStatus = async (targetUser: AdminUserRecord) => {
    setStatusUpdatingId(targetUser.id);
    const newStatus = targetUser.status === 'active' ? 'suspended' : 'active';
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/users/${targetUser.id}/status`, {
        method: 'PATCH',
        headers,
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || 'Failed to update user status');
      }

      setFeedback({
        type: 'success',
        message: `Account status for "${targetUser.displayName}" changed to ${newStatus}.`,
      });
      fetchUsers();
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error updating account status.',
      });
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleAdminResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToResetPassword) return;

    if (adminNewPassword.length < 6) {
      setFeedback({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    setIsResettingPassword(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/v1/admin/users/${userToResetPassword.id}/reset-password`, {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ newPassword: adminNewPassword }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || 'Failed to reset password');
      }

      setFeedback({
        type: 'success',
        message: `Password for "${userToResetPassword.displayName}" (${userToResetPassword.email}) updated to "${adminNewPassword}".`,
      });
      setUserToResetPassword(null);
      setAdminNewPassword('');
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Error occurred while resetting password.',
      });
    } finally {
      setIsResettingPassword(false);
    }
  };

  const isProtectedRootAdmin = (email: string) => {
    const protectedList = ['admin@pdi.academy', 'primordialdubbers@gmail.com'];
    return protectedList.includes(email.toLowerCase().trim());
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Banner - Combo 05: Fresh Canopy & Lime Sprout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-pdi-border pb-5">
        <div>
          <span className="text-xs uppercase font-mono tracking-wider text-lime-sprout font-bold">
            Administrative Governance
          </span>
          <h1 className="text-2xl sm:text-3xl font-heading font-black text-white tracking-wide mt-1">
            User Directory & Account Moderation
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Search registered voice artists, directors, and admins. Safely remove extra, test, or spam accounts.
          </p>
        </div>

        <button
          onClick={fetchUsers}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg bg-fresh-canopy border border-lime-sprout/30 text-lime-sprout hover:bg-lime-sprout hover:text-black transition-all"
        >
          <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          Refresh Directory
        </button>
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            feedback.type === 'success'
              ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
              : 'bg-rose-950/70 border border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="p-4 rounded-xl border border-pdi-border bg-pdi-surface flex flex-wrap items-center justify-between gap-4">
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[260px] max-w-md">
          <input
            type="text"
            placeholder="Search by name or email (e.g. arjun@pdi.com)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-20 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-lime-sprout"
          />
          <Search size={15} className="absolute left-3 top-2.5 text-slate-500" />
          <button
            type="submit"
            className="absolute right-1.5 top-1.5 px-3 py-1 rounded bg-slate-800 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-700"
          >
            Search
          </button>
        </form>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-lime-sprout"
            >
              <option value="all">All Roles</option>
              <option value="student">Student / Artists</option>
              <option value="director">Casting Directors</option>
              <option value="admin">Administrators</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-400 font-mono">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-lime-sprout"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="text-xs font-mono text-slate-400 pl-2 border-l border-slate-800">
            Total: <strong className="text-lime-sprout">{totalCount}</strong> users
          </div>
        </div>
      </div>

      {/* Users Table */}
      {isLoading ? (
        <div className="p-16 text-center text-slate-400 text-xs">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-lime-sprout" />
          Loading user accounts...
        </div>
      ) : users.length === 0 ? (
        <div className="p-16 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
          <UserX size={36} className="mx-auto mb-3 text-slate-600" />
          <p>No user accounts found matching your query "{searchQuery}".</p>
        </div>
      ) : (
        <div className="rounded-xl border border-pdi-border bg-pdi-surface overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-pdi-border bg-slate-950/60 font-mono uppercase text-[10px] text-slate-400">
                  <th className="py-3.5 px-4">User / Artist</th>
                  <th className="py-3.5 px-4">Roles</th>
                  <th className="py-3.5 px-4">Rank & Verified Points</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Registered</th>
                  <th className="py-3.5 px-4 text-right">Moderation Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pdi-border">
                {users.map((u) => {
                  const isSelf = user?.id === u.id;
                  const isProtected = isProtectedRootAdmin(u.email);

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-slate-900/40 transition-colors group"
                    >
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200 uppercase text-xs">
                            {u.displayName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white group-hover:text-lime-sprout transition-colors">
                                {u.displayName}
                              </span>
                              {isSelf && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-cyber-lime/20 text-cyber-lime border border-cyber-lime/40">
                                  You
                                </span>
                              )}
                              {isProtected && !isSelf && (
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-700">
                                  System Admin
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono block">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Roles */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.map((r) => (
                            <span
                              key={r}
                              className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold border ${
                                r === 'admin' || r === 'superadmin'
                                  ? 'bg-fresh-canopy text-lime-sprout border-lime-sprout/40'
                                  : r === 'director'
                                  ? 'bg-sky-950 text-sky-300 border-sky-500/40'
                                  : 'bg-charcoal-violet text-cyber-lime border-cyber-lime/40'
                              }`}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Rank & Points */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <RankBadge rank={u.currentRank} size="sm" />
                          <span className="text-xs font-mono font-bold text-cyber-lime">
                            {u.rankPoints.toLocaleString()} PTS
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold ${
                            u.status === 'active'
                              ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-300'
                              : 'bg-rose-950/70 border border-rose-800 text-rose-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                          {u.status}
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Reset Password Button */}
                          <button
                            onClick={() => {
                              setUserToResetPassword(u);
                              setAdminNewPassword('pdi' + Math.floor(100000 + Math.random() * 900000));
                            }}
                            className="p-1.5 rounded-lg border border-purple-800/60 bg-purple-950/40 text-purple-300 hover:bg-purple-900/60 transition-colors"
                            title="Reset User Password"
                          >
                            <KeyRound size={14} />
                          </button>

                          {/* Suspend / Activate toggle */}
                          {!isSelf && !isProtected && (
                            <button
                              onClick={() => handleToggleStatus(u)}
                              disabled={statusUpdatingId === u.id}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                u.status === 'active'
                                  ? 'border-amber-800/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60'
                                  : 'border-emerald-800/60 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60'
                              }`}
                              title={u.status === 'active' ? 'Suspend Account' : 'Reactivate Account'}
                            >
                              {u.status === 'active' ? <UserX size={14} /> : <UserCheck size={14} />}
                            </button>
                          )}

                          {/* Delete User Button */}
                          {isSelf ? (
                            <span className="text-[10px] font-mono text-slate-500 italic">Self Account</span>
                          ) : isProtected ? (
                            <span className="text-[10px] font-mono text-amber-400/80 italic flex items-center gap-1">
                              <ShieldCheck size={12} /> Protected
                            </span>
                          ) : (
                            <button
                              onClick={() => setUserToDelete(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-sm"
                              title="Permanently Delete User"
                            >
                              <Trash2 size={13} />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-3 border-t border-pdi-border bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing page <strong className="text-white">{page}</strong> of <strong className="text-white">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded bg-slate-900 border border-slate-700 disabled:opacity-40 text-white"
                >
                  <ChevronLeft size={16} />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded bg-slate-900 border border-slate-700 disabled:opacity-40 text-white"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-rose-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center">
                <ShieldAlert size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  Permanently Delete User?
                </h3>
                <span className="text-xs text-rose-400 font-mono">Irreversible Action</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete the account for:
            </p>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <p className="text-sm font-bold text-white">{userToDelete.displayName}</p>
              <p className="text-xs font-mono text-slate-400">{userToDelete.email}</p>
              <div className="flex items-center gap-2 pt-1">
                <RankBadge rank={userToDelete.currentRank} size="sm" />
                <span className="text-xs font-mono text-cyber-lime font-bold">
                  {userToDelete.rankPoints.toLocaleString()} PTS
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-rose-950/20 border border-rose-900/40 p-2.5 rounded-lg space-y-1">
              <p className="font-semibold text-rose-300">Consequences of deletion:</p>
              <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                <li>User login credentials will be removed.</li>
                <li>Matching Artist Profile and rank records will be deleted.</li>
                <li>Submitted takes and notification entries will be purged.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-900/30"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    <span>Permanently Delete User</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Reset Modal */}
      {userToResetPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-950 border border-purple-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setUserToResetPassword(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 text-purple-400">
              <div className="w-10 h-10 rounded-full bg-purple-950 border border-purple-800 flex items-center justify-center">
                <KeyRound size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-heading">
                  Reset User Password
                </h3>
                <span className="text-xs text-purple-400 font-mono">Administrative Credential Override</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
              <p className="text-sm font-bold text-white">{userToResetPassword.displayName}</p>
              <p className="text-xs font-mono text-slate-400">{userToResetPassword.email}</p>
              <div className="flex items-center gap-2 pt-1">
                <RankBadge rank={userToResetPassword.currentRank} size="sm" />
                <span className="text-xs font-mono text-cyber-lime font-bold">
                  {userToResetPassword.rankPoints.toLocaleString()} PTS
                </span>
              </div>
            </div>

            <form onSubmit={handleAdminResetPassword} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    New Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setAdminNewPassword('pdi' + Math.floor(100000 + Math.random() * 900000))}
                    className="text-[11px] text-cyber-lime hover:underline font-mono"
                  >
                    Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm font-mono text-cyber-lime focus:outline-none focus:border-cyber-lime"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Provide this password to the artist so they can sign in immediately.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUserToResetPassword(null)}
                  disabled={isResettingPassword}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPassword}
                  className="px-4 py-2 rounded-lg bg-cyber-lime hover:bg-lime-400 text-xs font-bold text-black transition-colors flex items-center gap-1.5 shadow-lg shadow-cyber-lime/20"
                >
                  {isResettingPassword ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound size={14} />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
