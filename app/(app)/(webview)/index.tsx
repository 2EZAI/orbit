import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
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
