import React, { useState } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from 'react-native-webview';
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";

export default function Webview() {
  const { external_url } = useLocalSearchParams();
console.log("external_url>>",external_url);
 

  return (
    <SafeAreaView className="flex-1 bg-background">
<WebView source={{ uri: external_url }} style={{ flex: 1 }} />

    </SafeAreaView>
  );
}
