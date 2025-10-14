import AsyncStorage from '@react-native-async-storage/async-storage';

// Keys for AsyncStorage
const IMAGE_STORAGE_KEY_PREFIX = 'notespark_image_';
const IMAGE_INDEX_KEY = 'notespark_image_index';

/**
 * Saves an image to AsyncStorage
 * @param imageData Base64 string or URI of the image
 * @param taskTitle Optional title to associate with the image
 * @returns The key where the image is stored
 */
export const saveImage = async (imageData: string, taskTitle?: string): Promise<string> => {
  try {
    // Get the next image index
    const indexStr = await AsyncStorage.getItem(IMAGE_INDEX_KEY);
    const index = indexStr ? parseInt(indexStr, 10) + 1 : 1;
    
    // Create a unique key for this image
    const timestamp = Date.now();
    const imageKey = `${IMAGE_STORAGE_KEY_PREFIX}${timestamp}_${index}`;
    
    // Create metadata for the image
    const metadata = {
      timestamp,
      taskTitle: taskTitle || 'Pomodoro Session',
      index,
    };
    
    // Store the image and metadata
    await AsyncStorage.setItem(imageKey, imageData);
    await AsyncStorage.setItem(`${imageKey}_meta`, JSON.stringify(metadata));
    await AsyncStorage.setItem(IMAGE_INDEX_KEY, index.toString());
    
    console.log('✅ Image saved to AsyncStorage with key:', imageKey);
    return imageKey;
  } catch (error) {
    console.error('❌ Failed to save image:', error);
    throw error;
  }
};

/**
 * Gets an image from AsyncStorage by key
 * @param imageKey The key of the image to retrieve
 * @returns The image data and metadata
 */
export const getImage = async (imageKey: string) => {
  try {
    const imageData = await AsyncStorage.getItem(imageKey);
    const metadataStr = await AsyncStorage.getItem(`${imageKey}_meta`);
    
    if (!imageData || !metadataStr) {
      throw new Error(`Image with key ${imageKey} not found`);
    }
    
    const metadata = JSON.parse(metadataStr);
    return { imageData, metadata };
  } catch (error) {
    console.error('❌ Failed to get image:', error);
    throw error;
  }
};

/**
 * Lists all images stored in AsyncStorage
 * @returns Array of image keys and metadata
 */
export const listAllImages = async () => {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const imageKeys = allKeys.filter(key => 
      key.startsWith(IMAGE_STORAGE_KEY_PREFIX) && !key.endsWith('_meta')
    );
    
    const result = await Promise.all(
      imageKeys.map(async (key) => {
        const metadataStr = await AsyncStorage.getItem(`${key}_meta`);
        const metadata = metadataStr ? JSON.parse(metadataStr) : null;
        return { key, metadata };
      })
    );
    
    return result;
  } catch (error) {
    console.error('❌ Failed to list images:', error);
    throw error;
  }
};

/**
 * Deletes an image from AsyncStorage
 * @param imageKey The key of the image to delete
 */
export const deleteImage = async (imageKey: string) => {
  try {
    await AsyncStorage.removeItem(imageKey);
    await AsyncStorage.removeItem(`${imageKey}_meta`);
    console.log('✅ Image deleted from AsyncStorage:', imageKey);
  } catch (error) {
    console.error('❌ Failed to delete image:', error);
    throw error;
  }
};

/**
 * Debug function to print all images stored in AsyncStorage
 */
export const debugPrintAllImages = async () => {
  try {
    const images = await listAllImages();
    console.log('=== STORED IMAGES ===');
    console.log(`Total images: ${images.length}`);
    
    for (const image of images) {
      console.log(`Key: ${image.key}`);
      console.log(`Metadata: ${JSON.stringify(image.metadata, null, 2)}`);
      
      // Get the first 50 characters of the image data to preview
      const { imageData } = await getImage(image.key);
      const preview = typeof imageData === 'string' 
        ? `${imageData.substring(0, 50)}...` 
        : 'Not a string';
      
      console.log(`Data preview: ${preview}`);
      console.log('-------------------');
    }
  } catch (error) {
    console.error('❌ Failed to debug print images:', error);
  }
};