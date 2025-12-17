import { useLocalSearchParams } from "expo-router";
import React from "react";
import { UnifiedProfilePage } from "~/src/components/profile/UnifiedProfilePage";

export default function ProfileScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();

  return <UnifiedProfilePage userId={id} showBackButton={true} from={from} />;
}
