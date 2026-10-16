import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserSummary, ArtistProfileSummary, Role } from '@pdi/shared';

interface AuthContextType {
  user: UserSummary | null;
  profile: ArtistProfileSummary | null;
  token: string | null;
  isLoading: boolean;
  activeRole: Role | null;
  login: (email: string, password: string, forceLogoutOthers?: boolean) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
    requestedRole?: Role,
    adminInviteToken?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  setActiveRole: (role: Role) => void;
  refreshMe: () => Promise<void>;
  setProfile: React.Dispatch<React.SetStateAction<ArtistProfileSummary | null>>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSummary | null>(null);
  const [profile, setProfile] = useState<ArtistProfileSummary | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('pdi_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRole, setActiveRole] = useState<Role | null>(null);

  const refreshMe = async () => {
    try {
      const storedToken = localStorage.getItem('pdi_token');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }

      const res = await fetch('/api/v1/auth/me', {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const body = await res.json();
        setUser(body.data.user);
        setProfile(body.data.profile || null);
        if (body.data.user.roles?.length > 0 && !activeRole) {
          setActiveRole(body.data.user.roles[0]);
        }
      } else {
        setUser(null);
        setProfile(null);
        setToken(null);
        localStorage.removeItem('pdi_token');
      }
    } catch (err) {
      console.error('Failed to load session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshMe();
  }, []);

  const login = async (email: string, password: string, forceLogoutOthers?: boolean) => {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, forceLogoutOthers }),
    });

    const body = await res.json();
    if (!res.ok) {
      const err: any = new Error(body.message || 'Login failed');
      err.code = body.error?.code;
      err.status = res.status;
      err.details = body.error;
      throw err;
    }

    setUser(body.data.user);
    setProfile(body.data.profile || null);
    setToken(body.data.token);
    localStorage.setItem('pdi_token', body.data.token);
    if (body.data.user.roles?.length > 0) {
      setActiveRole(body.data.user.roles[0]);
    }
  };

  const register = async (
    email: string,
    password: string,
    displayName: string,
    requestedRole: Role = 'student',
    adminInviteToken?: string
  ) => {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password, displayName, requestedRole, adminInviteToken }),
    });

    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.message || 'Registration failed');
    }

    setUser(body.data.user);
    setProfile(body.data.profile || null);
    setToken(body.data.token);
    localStorage.setItem('pdi_token', body.data.token);
    setActiveRole(requestedRole);
  };

  const logout = async () => {
    try {
      const storedToken = localStorage.getItem('pdi_token');
      const headers: Record<string, string> = {};
      if (storedToken) {
        headers['Authorization'] = `Bearer ${storedToken}`;
      }
      await fetch('/api/v1/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers,
      });
    } catch (e) {
      console.warn('Logout request warning:', e);
    } finally {
      setUser(null);
      setProfile(null);
      setToken(null);
      setActiveRole(null);
      localStorage.removeItem('pdi_token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        isLoading,
        activeRole,
        login,
        register,
        logout,
        setActiveRole,
        refreshMe,
        setProfile,
      }}
    >

      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
