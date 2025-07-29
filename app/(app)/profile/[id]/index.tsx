import React from "react";
import { useLocalSearchParams } from "expo-router";
import { UnifiedProfilePage } from "~/src/components/profile/UnifiedProfilePage";

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return <UnifiedProfilePage userId={id} showBackButton={true} />;
}
