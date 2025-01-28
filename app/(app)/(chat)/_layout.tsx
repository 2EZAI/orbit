import { Stack } from "expo-router";

export default function ChatLayout() {
  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen
        name="index"
        options={{
          title: "Messages",
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: "Chat",
          presentation: "card",
        }}
      />
    </Stack>
  );
}
