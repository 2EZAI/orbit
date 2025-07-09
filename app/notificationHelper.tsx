import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
// import * as Device from 'expo-device';

export default async function registerForPushNotificationsAsync() {
//   if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      alert('Failed to get push token!');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    console.log('Expo Push Token:', tokenData.data);
    return tokenData.data;
//   } else {
//     alert('Use a physical device for push notifications');
//     return null;
//   }

}