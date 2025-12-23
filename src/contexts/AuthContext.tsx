import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { Database, UserRole } from '../lib/database.types';

type UserProfile = Database['public']['Tables']['users']['Row'];
type UserPermissions = Database['public']['Tables']['permissions']['Row'];
type Company = Database['public']['Tables']['companies']['Row'];

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  permissions: UserPermissions | null;
  company: Company | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string, companyName: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isUser: boolean;
  hasPermission: (permission: keyof Omit<UserPermissions, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData);

      if (profileData?.company_id) {
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', profileData.company_id)
          .maybeSingle();
        setCompany(companyData);
      }

      if (profileData && ['member', 'user'].includes(profileData.role)) {
        const { data: permData } = await supabase
          .from('permissions')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        setPermissions(permData);
      } else {
        setPermissions(null);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await loadProfile(user.id);
    }
  }, [user?.id, loadProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfile(session.user.id);
        } else {
          setProfile(null);
          setPermissions(null);
          setCompany(null);
          setLoading(false);
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string, companyName: string) => {
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert({ name: companyName })
      .select()
      .single();

    if (companyError) throw companyError;

    const { error: profileError } = await supabase.from('users').insert({
      id: authData.user.id,
      email,
      name,
      company_id: companyData.id,
      role: 'admin' as UserRole,
    });

    if (profileError) throw profileError;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const isUser = profile?.role === 'user' || profile?.role === 'member';

  const hasPermission = useCallback((permission: keyof Omit<UserPermissions, 'id' | 'user_id' | 'created_at' | 'updated_at'>): boolean => {
    if (isSuperAdmin || profile?.role === 'admin') return true;
    if (!permissions) return false;
    return permissions[permission] === true;
  }, [isSuperAdmin, profile?.role, permissions]);

  const value = {
    user,
    profile,
    permissions,
    company,
    session,
    loading,
    signIn,
    signUp,
    signOut,
    refreshProfile,
    isSuperAdmin,
    isAdmin,
    isUser,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
