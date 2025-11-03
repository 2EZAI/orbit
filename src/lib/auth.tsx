import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Session } from "@supabase/supabase-js";
import { NativeModules, Platform } from "react-native";

// Get native module for iOS Keychain token storage (for Siri integration)
const { OrbitAuthService } = NativeModules;

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
      
      // Store auth token in iOS Keychain for Siri integration
      if (session?.access_token && Platform.OS === 'ios' && OrbitAuthService) {
        OrbitAuthService.storeToken(session.access_token)
          .then(() => console.log('✅ [Siri] Token stored for Siri integration'))
          .catch((err: any) => console.error('❌ [Siri] Failed to store token:', err));
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state change:", event, "Session:", !!session);
      setSession(session);

      // Store/delete auth token in iOS Keychain for Siri integration
      if (Platform.OS === 'ios' && OrbitAuthService) {
        if (event === 'SIGNED_IN' && session?.access_token) {
          // Store token when user logs in
          OrbitAuthService.storeToken(session.access_token)
            .then(() => console.log('✅ [Siri] Token stored for Siri integration'))
            .catch((err: any) => console.error('❌ [Siri] Failed to store token:', err));
        } else if (event === 'SIGNED_OUT') {
          // Delete token when user logs out
          OrbitAuthService.deleteToken()
            .then(() => console.log('✅ [Siri] Token deleted'))
            .catch((err: any) => console.error('❌ [Siri] Failed to delete token:', err));
        }
      }

      if (event === "SIGNED_OUT") {
        console.log("User signed out; navigation handled elsewhere");
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
