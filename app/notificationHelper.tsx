import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
// import * as Device from 'expo-device';

export default async function registerForPushNotificationsAsync() {
  console.log("registerForPushNotificationsAsync>");
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
  console.log("finalStatus>",finalStatus);
    const tokenData = await Notifications.getExpoPushTokenAsync();
    console.log('tokenData>>');
    return tokenData.data;
//   } else {
//     alert('Use a physical device for push notifications');
//     return null;
//   }

}