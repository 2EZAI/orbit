import { Stack } from "expo-router";

export default function CreateLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="summary"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
