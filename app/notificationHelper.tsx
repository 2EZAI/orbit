import * as Notifications from 'expo-notifications';
import {Platform} from 'react-native';
import Constants from 'expo-constants';

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

     if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }
  try{

  
  console.log("finalStatus>",finalStatus);
  const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('tokenData>>',tokenData);
    return tokenData.data;
    }
    catch(e)
    {
       console.log("e>>>",e);
    }
//   } else {
//     alert('Use a physical device for push notifications');
//     return null;
//   }

}