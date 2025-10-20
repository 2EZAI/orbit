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
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    return status === "granted";
  }

  /**
   * Request media library permissions
   */
  static async requestMediaLibraryPermissions(): Promise<boolean> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === "granted";
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
    const hasPermission = await this.requestCameraPermissions();
    
    if (!hasPermission) {
      Alert.alert(
        "Camera Permission Required",
        "Please grant camera permission to take photos.",
        [{ text: "OK" }]
      );
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
    const hasPermission = await this.requestMediaLibraryPermissions();
    
    if (!hasPermission) {
      Alert.alert(
        "Media Library Permission Required",
        "Please grant media library permission to select photos.",
        [{ text: "OK" }]
      );
      return [];
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: options.mediaTypes || ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: options.allowsMultipleSelection || false,
      quality: options.quality || 0.8,
      selectionLimit: options.selectionLimit || 1,
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
    return new Promise((resolve) => {
      this.showImageSourcePicker(
        async () => {
          const results = await this.launchCamera(options);
          resolve(results);
        },
        async () => {
          const results = await this.launchImageLibrary(options);
          resolve(results);
        },
        () => {
          resolve([]);
        }
      );
    });
  }
}
