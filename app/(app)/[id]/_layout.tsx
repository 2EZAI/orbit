import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="edit"
        options={{
          presentation: "modal",
          animation: "slide_from_bottom",
          headerShown: false,
          gestureEnabled: true,
          gestureDirection: "vertical",
        }}
      />
    </Stack>
  );
}
