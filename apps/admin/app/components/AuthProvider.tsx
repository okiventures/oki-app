'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase/client';

interface AdminUser {
  id: string;
  email: string;
  accessToken: string;
}

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  logout: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const supabase = createBrowserClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase
          .from('users')
          .select('user_type')
          .eq('id', session.user.id)
          .single()
          .then(({ data: profile }) => {
            if (profile?.user_type === 'admin') {
              setUser({
                id: session.user.id,
                email: session.user.email ?? '',
                accessToken: session.access_token,
              });
            } else {
              supabase.auth.signOut();
            }
            setLoading(false);
          });
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setUser({
          id: session.user.id,
          email: session.user.email ?? '',
          accessToken: session.access_token,
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [loading, user, pathname, router]);

  const logout = useCallback(async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[13px] text-gray-500">Loading...</p>
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return null;
  }

  return <AuthContext.Provider value={{ user, loading, logout }}>{children}</AuthContext.Provider>;
}
