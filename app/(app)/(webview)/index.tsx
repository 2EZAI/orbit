import React, { useState, useEffect } from "react";
import { View, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
import { useRouter } from "expo-router";
import { useLocalSearchParams } from "expo-router";
import { AlertDialogs } from "~/src/components/ui/alertdialogs";

export default function Webview() {
  const [isShowAlert, setIsShowAlert] = useState(false);
  const { external_url } = useLocalSearchParams();
  console.log("external_url>>", external_url);

  useEffect(() => {
    return () => {
      setIsShowAlert(true);
    };
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <WebView source={{ uri: external_url }} style={{ flex: 1 }} />
      <AlertDialogs isvisible={isShowAlert} />
    </SafeAreaView>
  );
}
