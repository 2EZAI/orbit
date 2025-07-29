import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Session } from "@supabase/supabase-js";
import { router } from "expo-router";

type AuthContextType = {
  session: Session | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("Initial session check:", !!session);
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, "Session:", !!session);
      setSession(session);

      // Only redirect on sign out - let app layout handle authenticated routing
      if (event === "SIGNED_OUT") {
        console.log("User signed out, redirecting to landing page");
        router.replace("/");
      }
      // Don't redirect on SIGNED_IN - causes issues with session persistence
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
