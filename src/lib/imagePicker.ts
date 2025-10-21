import * as ImagePicker from "expo-image-picker";
import { Alert, Platform } from "react-native";

export interface ImagePickerOptions {
  allowsMultipleSelection?: boolean;
  quality?: number;
  selectionLimit?: number;
  allowsEditing?: boolean;
  mediaTypes?: ImagePicker.MediaTypeOptions;
}

export interface ImagePickerResult {
  uri: string;
  type: string;
  name: string;
}

export class ImagePickerService {
  /**
   * Request camera permissions
   */
  static async requestCameraPermissions(): Promise<boolean> {
    try {
      console.log('🔍 [ImagePicker] Requesting camera permissions...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('🔍 [ImagePicker] Camera permission status:', status);
      
      if (status === "granted") {
        console.log('✅ [ImagePicker] Camera permission granted');
        return true;
      } else if (status === "denied") {
        console.log('❌ [ImagePicker] Camera permission denied');
        Alert.alert(
          "Permission Denied",
          "Camera permission was denied. Please enable it in your device settings to take photos.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => {
              console.log('User should open settings manually');
            }}
          ]
        );
        return false;
      } else {
        console.log('⚠️ [ImagePicker] Camera permission status unknown:', status);
        return false;
      }
    } catch (error) {
      console.error('❌ [ImagePicker] Error requesting camera permissions:', error);
      return false;
    }
  }

  /**
   * Request media library permissions
   */
  static async requestMediaLibraryPermissions(): Promise<boolean> {
    try {
      console.log('🔍 [ImagePicker] Requesting media library permissions...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('🔍 [ImagePicker] Media library permission status:', status);
      
      if (status === "granted") {
        console.log('✅ [ImagePicker] Media library permission granted');
        return true;
      } else if (status === "denied") {
        console.log('❌ [ImagePicker] Media library permission denied');
        Alert.alert(
          "Permission Denied",
          "Media library permission was denied. Please enable it in your device settings to select photos.",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Open Settings", onPress: () => {
              // This would open device settings, but we can't do that directly
              console.log('User should open settings manually');
            }}
          ]
        );
        return false;
      } else {
        console.log('⚠️ [ImagePicker] Media library permission status unknown:', status);
        return false;
      }
    } catch (error) {
      console.error('❌ [ImagePicker] Error requesting media library permissions:', error);
      return false;
    }
  }

  /**
   * Show action sheet to choose between camera and gallery
   */
  static showImageSourcePicker(
    onCamera: () => void,
    onGallery: () => void,
    onCancel?: () => void
  ) {
    Alert.alert(
      "Select Image Source",
      "Choose how you'd like to add an image",
      [
        {
          text: "Camera",
          onPress: onCamera,
        },
        {
          text: "Gallery",
          onPress: onGallery,
        },
        {
          text: "Cancel",
          style: "cancel",
          onPress: onCancel,
        },
      ],
      { cancelable: true }
    );
  }

  /**
   * Launch camera to take a photo
   */
  static async launchCamera(options: ImagePickerOptions = {}): Promise<ImagePickerResult[]> {
    console.log('🔍 [ImagePicker] Launching camera...');
    const hasPermission = await this.requestCameraPermissions();
    
    if (!hasPermission) {
      console.log('❌ [ImagePicker] Camera permission not granted, cannot launch camera');
      return [];
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
      allowsEditing: options.allowsEditing || false,
      quality: options.quality || 0.8,
      ...options,
    });

    if (result.canceled) {
      return [];
    }

    return this.processAssets(result.assets);
  }

  /**
   * Launch image library to select photos
   */
  static async launchImageLibrary(options: ImagePickerOptions = {}): Promise<ImagePickerResult[]> {
    console.log('🔍 [ImagePicker] Launching image library...');
    const hasPermission = await this.requestMediaLibraryPermissions();
    
    if (!hasPermission) {
      console.log('❌ [ImagePicker] Media library permission not granted, cannot launch library');
      return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: options.allowsMultipleSelection || false,
      quality: options.quality || 0.8,
      selectionLimit: options.allowsMultipleSelection ? (options.selectionLimit || undefined) : 1,
      allowsEditing: options.allowsEditing || false,
      ...options,
    });

    if (result.canceled) {
      return [];
    }

    return this.processAssets(result.assets);
  }

  /**
   * Process assets from ImagePicker result
   */
  private static processAssets(assets: ImagePicker.ImagePickerAsset[]): ImagePickerResult[] {
    return assets
      .filter((asset) => {
        const isValidUri = asset.uri && asset.uri.startsWith("file://");
        const isValidType = asset.type === "image";
        return isValidUri && isValidType;
      })
      .map((asset) => {
        const extension = asset.uri.split(".").pop()?.toLowerCase() || "jpg";
        const timestamp = Date.now();
        
        return {
          uri: asset.uri,
          type: `image/${extension === "jpg" ? "jpeg" : extension}`,
          name: `image_${timestamp}.${extension}`,
        };
      });
  }

  /**
   * Combined method that shows action sheet and handles both camera and gallery
   */
  static async pickImage(options: ImagePickerOptions = {}): Promise<ImagePickerResult[]> {
    console.log('🔍 [ImagePicker] Starting image picker with options:', options);
    return new Promise((resolve) => {
      this.showImageSourcePicker(
        async () => {
          console.log('📷 [ImagePicker] User selected camera');
          try {
            const results = await this.launchCamera(options);
            console.log('📷 [ImagePicker] Camera results:', results.length, 'images');
            resolve(results);
          } catch (error) {
            console.error('❌ [ImagePicker] Camera error:', error);
            resolve([]);
          }
        },
        async () => {
          console.log('🖼️ [ImagePicker] User selected gallery');
          try {
            const results = await this.launchImageLibrary(options);
            console.log('🖼️ [ImagePicker] Gallery results:', results.length, 'images');
            resolve(results);
          } catch (error) {
            console.error('❌ [ImagePicker] Gallery error:', error);
            resolve([]);
          }
        },
        () => {
          console.log('❌ [ImagePicker] User cancelled');
          resolve([]);
        }
      );
    });
  }
}
