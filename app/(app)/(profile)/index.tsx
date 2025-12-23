import React from "react";
import { useLocalSearchParams } from "expo-router";
import { UnifiedProfilePage } from "~/src/components/profile/UnifiedProfilePage";

export default function Profile() {
  const { from } = useLocalSearchParams<{ from?: string }>();
  return <UnifiedProfilePage from={from} />;
}
