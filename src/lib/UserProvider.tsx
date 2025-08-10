import React, { createContext, useContext } from "react";
import { useUserData, UseUserReturn } from "~/hooks/useUserData";

// Create React Context for User data
const UserContext = createContext<UseUserReturn | null>(null);

// Provider component
export function UserProvider({ children }: { children: React.ReactNode }) {
  const userData = useUserData(); // Use the original hook logic
  return (
    <UserContext.Provider value={userData}>{children}</UserContext.Provider>
  );
}

// Hook that consumes the context
export function useUser(): UseUserReturn {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
