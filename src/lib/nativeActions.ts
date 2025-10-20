import { Linking, Platform, Alert } from 'react-native';
import { haptics } from './haptics';

/**
 * Native actions utility for handling phone calls and map navigation
 * Provides clean, reusable functionality with proper error handling
 */

/**
 * Opens the native phone dialer with the specified phone number
 * @param phoneNumber - The phone number to call (will be cleaned of non-digits)
 */
export const makePhoneCall = async (phoneNumber: string): Promise<void> => {
  try {
    // Clean the phone number - remove all non-digit characters except +
    const cleanedNumber = phoneNumber.replace(/[^\d+]/g, '');
    
    if (!cleanedNumber) {
      Alert.alert('Error', 'Invalid phone number');
      return;
    }

    // Trigger haptic feedback
    haptics.light();

    // Open the phone dialer
    const phoneUrl = `tel:${cleanedNumber}`;
    const canOpen = await Linking.canOpenURL(phoneUrl);
    
    if (canOpen) {
      await Linking.openURL(phoneUrl);
    } else {
      Alert.alert('Error', 'Unable to open phone dialer');
    }
  } catch (error) {
    console.error('Error making phone call:', error);
    Alert.alert('Error', 'Unable to make phone call');
  }
};

/**
 * Opens maps app with directions to the specified coordinates
 * @param latitude - The latitude coordinate
 * @param longitude - The longitude coordinate
 * @param address - Optional address string for better context
 */
export const openMapDirections = async (
  latitude: number,
  longitude: number,
  address?: string
): Promise<void> => {
  try {
    if (!latitude || !longitude) {
      Alert.alert('Error', 'Invalid coordinates');
      return;
    }

    // Trigger haptic feedback
    haptics.light();

    let mapUrl: string;

    if (Platform.OS === 'ios') {
      // Use Apple Maps on iOS
      mapUrl = `https://maps.apple.com/?daddr=${latitude},${longitude}`;
      if (address) {
        mapUrl += `&q=${encodeURIComponent(address)}`;
      }
    } else {
      // Use Google Maps on Android (falls back to Apple Maps if Google Maps not available)
      mapUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
      if (address) {
        mapUrl += `&destination_place_id=${encodeURIComponent(address)}`;
      }
    }

    const canOpen = await Linking.canOpenURL(mapUrl);
    
    if (canOpen) {
      await Linking.openURL(mapUrl);
    } else {
      // Fallback to generic maps URL
      const fallbackUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
      const canOpenFallback = await Linking.canOpenURL(fallbackUrl);
      
      if (canOpenFallback) {
        await Linking.openURL(fallbackUrl);
      } else {
        Alert.alert('Error', 'Unable to open maps application');
      }
    }
  } catch (error) {
    console.error('Error opening map directions:', error);
    Alert.alert('Error', 'Unable to open directions');
  }
};

/**
 * Opens a generic map view (without directions) for the specified coordinates
 * @param latitude - The latitude coordinate
 * @param longitude - The longitude coordinate
 * @param label - Optional label for the location
 */
export const openMapView = async (
  latitude: number,
  longitude: number,
  label?: string
): Promise<void> => {
  try {
    if (!latitude || !longitude) {
      Alert.alert('Error', 'Invalid coordinates');
      return;
    }

    // Trigger haptic feedback
    haptics.light();

    let mapUrl: string;

    if (Platform.OS === 'ios') {
      // Use Apple Maps on iOS
      mapUrl = `https://maps.apple.com/?ll=${latitude},${longitude}`;
      if (label) {
        mapUrl += `&q=${encodeURIComponent(label)}`;
      }
    } else {
      // Use Google Maps on Android
      mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      if (label) {
        mapUrl += `&query_place_id=${encodeURIComponent(label)}`;
      }
    }

    const canOpen = await Linking.canOpenURL(mapUrl);
    
    if (canOpen) {
      await Linking.openURL(mapUrl);
    } else {
      Alert.alert('Error', 'Unable to open maps application');
    }
  } catch (error) {
    console.error('Error opening map view:', error);
    Alert.alert('Error', 'Unable to open map');
  }
};

/**
 * Opens a web browser with the specified URL
 * @param url - The URL to open
 */
export const openWebBrowser = async (url: string): Promise<void> => {
  try {
    if (!url) {
      Alert.alert('Error', 'Invalid URL');
      return;
    }

    // Trigger haptic feedback
    haptics.light();

    // Ensure URL has protocol
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    
    const canOpen = await Linking.canOpenURL(formattedUrl);
    
    if (canOpen) {
      await Linking.openURL(formattedUrl);
    } else {
      Alert.alert('Error', 'Unable to open web browser');
    }
  } catch (error) {
    console.error('Error opening web browser:', error);
    Alert.alert('Error', 'Unable to open web browser');
  }
};
