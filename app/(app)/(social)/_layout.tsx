import { Stack } from "expo-router";
import { useTheme } from "~/src/components/ThemeProvider";

export default function SocialLayout() {
  const { isDarkMode } = useTheme();
  const { theme } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerTitle: "Social",
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.card,
        },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
