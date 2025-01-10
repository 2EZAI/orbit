// src/components/ThemeProvider.tsx
import { Theme } from "@react-navigation/native";
import { createContext, useContext } from "react";
import { View } from "react-native";
import type { PropsWithChildren } from "react";
import { useColorScheme } from "~/src/lib/useColorScheme";
import { NAV_THEME } from "~/src/lib/constants";

type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
  theme: Theme;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LIGHT_THEME: Theme = {
  dark: false,
  colors: NAV_THEME.light,
  fonts: {
    regular: { fontFamily: "Inter", fontWeight: "400" },
    medium: { fontFamily: "Inter", fontWeight: "500" },
    bold: { fontFamily: "Inter", fontWeight: "700" },
    heavy: { fontFamily: "Inter", fontWeight: "900" },
  },
};

const DARK_THEME: Theme = {
  dark: true,
  colors: NAV_THEME.dark,
  fonts: LIGHT_THEME.fonts,
};

export function ThemeProvider({ children }: PropsWithChildren) {
  const { isDarkColorScheme, toggleColorScheme } = useColorScheme();

  const value = {
    isDarkMode: isDarkColorScheme,
    toggleTheme: toggleColorScheme,
    theme: isDarkColorScheme ? DARK_THEME : LIGHT_THEME,
  };

  return (
    <ThemeContext.Provider value={value}>
      <View className={`flex-1 ${isDarkColorScheme ? "dark" : ""}`}>
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
