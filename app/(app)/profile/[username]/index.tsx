import React from "react";
import { useLocalSearchParams, router } from "expo-router";
import { UnifiedProfilePage } from "~/src/components/profile/UnifiedProfilePage";

export default function ProfilePage() {
  const { username } = useLocalSearchParams();

  return (
    <UnifiedProfilePage
      userId={typeof username === "string" ? username : undefined}
      showBackButton={true}
      onBack={() => router.back()}
    />
  );
}
