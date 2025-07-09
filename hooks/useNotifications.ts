import { useEffect, useRef, useState } from 'react';
import {Platform} from 'react-native';
import * as Notifications from 'expo-notifications';
import type { EventSubscription } from 'expo-modules-core';
import registerForPushNotificationsAsync from "~/app/notificationHelper";
import { supabase } from "~/src/lib/supabase";
import { useAuth } from "~/src/lib/auth";
import { platform } from 'os';

export default function useNotifications() {
  const notificationListener = useRef<EventSubscription | undefined>(undefined);
  const responseListener = useRef<EventSubscription | undefined>(undefined);
  const { session } = useAuth();

  useEffect(() => {
    hitPushToken();
    setNotifHandler();
    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('orbitNotifiation', {
        name: 'orbitNotifiation',
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#FF231F7C',
      });
    }
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      const isLocal = notification.request.content.data?.localEcho;
      if (isLocal) return; // 🛡 prevent infinite loop
  
      console.log('📩 Remote notification received in foreground:', notification);
  
      // Show as a local notification
      if (Platform.OS === 'ios') {
      showLocalNotification(notification);
      }
   
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📲 Notification tapped:', response);
    });
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response) {
        // App was launched from a notification tap
        console.log('Notification tap caused app launch:', response);
        // Handle navigation or logic here
      }
    });

    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  async function showLocalNotification(remoteNotification:any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: remoteNotification.request.content.title || 'New Notification',
        body: remoteNotification.request.content.body || '',
        data: { ...remoteNotification.request.content.data, localEcho: true },
      },
      trigger: null, // immediate
    });
  }
  async function setNotifHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert:true,
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }
  
  async function hitPushToken() {
    const pushToken= await registerForPushNotificationsAsync();
    if(pushToken!=null)
    {
      upsertDeviceToken(pushToken);
    }
  }
  // Function to insert or update device token
  async function upsertDeviceToken( newDeviceToken: string) {
    if (!session?.user) return false;
   // 1. Check if entry exists
const { data: existing, error: selectError } = await supabase
.from('device_tokens')
.select('*')
.eq('user_id', session?.user?.id)
.single();

if (selectError && selectError.code !== 'PGRST116') {
console.error('Select failed:', selectError.message);
} else if (existing) {
// 2. Update
await supabase
  .from('device_tokens')
  .update({ token: newDeviceToken })
  .eq('user_id', session?.user?.id);
} else {
// 3. Insert
await supabase
  .from('device_tokens')
  .insert({ user_id: session?.user?.id, token: newDeviceToken ,
  platform :Platform?.OS});
}

  }
  
}
