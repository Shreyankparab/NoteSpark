import { storage, auth, functions } from '../firebase/firebaseConfig';
import { ref, getDownloadURL, listAll, deleteObject } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { getMetadata } from 'firebase/storage';
import { Alert } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

// Storage paths
const IMAGES_PATH = 'images';

// Cloudinary (unsigned) config - set these to your values
const CLOUDINARY_CLOUD_NAME = 'dtvzsivnl';
const CLOUDINARY_UPLOAD_PRESET = 'notespark';
const CLOUDINARY_FOLDER = 'notespark';

/**
 * Uploads base64 image to Cloudinary via unsigned preset and returns the secure URL
 */
export const uploadToCloudinaryBase64 = async (
  base64: string,
  mimeType: string,
  options?: { folder?: string }
): Promise<string> => {
  const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${base64}`;
  const form = new FormData();
  form.append('file', dataUrl as any);
  form.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (options?.folder) form.append('folder', options.folder as any);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json();
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message || 'Cloudinary upload failed');
  }
  return json.secure_url as string;
};

/**
 * Saves an image to Firebase Storage
 * @param imageData Base64 string or URI of the image
 * @param taskTitle Optional title to associate with the image
 * @returns The reference path where the image is stored
 */
export const saveImage = async (imageData: any, taskTitle?: string): Promise<string> => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be logged in to save images');
    }
    
    const timestamp = Date.now();
    const imageName = `${timestamp}_${Math.random().toString(36).substring(2, 10)}`;
    const imagePath = `${IMAGES_PATH}/${user.uid}/${imageName}`;
    const imageRef = ref(storage, imagePath);
    
    // Base metadata shared across uploads
    const baseMetadata = {
      customMetadata: {
        timestamp: timestamp.toString(),
        taskTitle: taskTitle || 'Pomodoro Session',
        userId: user.uid
      }
    } as const;
    
    // Create a simple JSON object with timer data
    const timerData = {
      timerData: true,
      taskTitle: taskTitle || 'Pomodoro Session',
      timestamp: timestamp,
      completedAt: Date.now()
    };
    
    // Convert to JSON string regardless of input type
    const jsonString = JSON.stringify(timerData);
    const toBase64 = (input: string): string => {
      // Prefer btoa in React Native/Expo; fallback to Buffer if available
      try {
        // Encode to UTF-8 bytes then btoa
        // eslint-disable-next-line no-undef
        return btoa(unescape(encodeURIComponent(input)));
      } catch {
        try {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const Buf = (global as any).Buffer || require('buffer').Buffer;
          return Buf.from(input, 'utf8').toString('base64');
        } catch {
          return '';
        }
      }
    };
    const jsonDataUrl = `data:application/json;base64,${toBase64(jsonString)}`;
    
    // Upload via Cloud Function (callable) to avoid any Blob usage on device
    const uploadImageFn = httpsCallable(functions, 'uploadImage');

    // Handle explicit base64 payload objects: { base64: string, mimeType?: string }
    if (imageData && typeof imageData === 'object' && typeof imageData.base64 === 'string') {
      const contentType = typeof imageData.mimeType === 'string' ? imageData.mimeType : 'image/jpeg';
      await uploadImageFn({
        base64: imageData.base64,
        contentType,
        taskTitle: taskTitle || 'Pomodoro Session',
        path: imagePath,
      });
    } else if (typeof imageData === 'string' && imageData.startsWith('data:')) {
      try {
        // It's a base64 data URI; extract base64 and contentType, then upload as 'base64'
        const headerMatch = imageData.match(/^data:([^;]+);base64,/);
        const contentType = headerMatch?.[1] || 'image/jpeg';
        const base64Body = imageData.replace(/^data:[^;]+;base64,/, '');
        await uploadImageFn({
          base64: base64Body,
          contentType,
          taskTitle: taskTitle || 'Pomodoro Session',
          path: imagePath,
        });
      } catch (imageError) {
        console.log('Failed to process image, saving timer data instead:', imageError);
        // If image processing fails, fall back to saving timer data
        const jsonBase64 = jsonDataUrl.replace(/^data:[^;]+;base64,/, '');
        await uploadImageFn({
          base64: jsonBase64,
          contentType: 'application/json',
          taskTitle: taskTitle || 'Pomodoro Session',
          path: imagePath,
        });
      }
    } else {
      // Not an image, just save the timer data
      const jsonBase64 = jsonDataUrl.replace(/^data:[^;]+;base64,/, '');
      await uploadImageFn({
        base64: jsonBase64,
        contentType: 'application/json',
        taskTitle: taskTitle || 'Pomodoro Session',
        path: imagePath,
      });
    }
    
    console.log('✅ Image saved to Firebase Storage with path:', imagePath);
    return imagePath;
  } catch (error) {
    console.error('❌ Failed to save image:', error);
    throw error;
  }
};

/**
 * Gets an image from Firebase Storage by path
 * @param imagePath The path of the image to retrieve
 * @returns The image data URL and metadata
 */
export const getImage = async (imagePath: string) => {
  try {
    const imageRef = ref(storage, imagePath);
    const url = await getDownloadURL(imageRef);
    const metadataResult = await getMetadata(imageRef);
    
    const metadata = metadataResult.customMetadata || {};
    
    return { 
      imageData: url, 
      metadata 
    };
  } catch (error) {
    console.error('❌ Failed to get image:', error);
    throw error;
  }
};

/**
 * Lists all images stored in Firebase Storage for the current user
 * @returns Array of image paths and metadata
 */
export const listAllImages = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User must be logged in to list images');
    }
    
    const userImagesRef = ref(storage, `${IMAGES_PATH}/${user.uid}`);
    const listResult = await listAll(userImagesRef);
    
    const result = await Promise.all(
      listResult.items.map(async (itemRef) => {
        try {
          const metadataResult = await getMetadata(itemRef);
          return { 
            path: itemRef.fullPath, 
            metadata: metadataResult.customMetadata || {} 
          };
        } catch (error) {
          console.error('Error getting metadata for', itemRef.fullPath, error);
          return { 
            path: itemRef.fullPath, 
            metadata: {} 
          };
        }
      })
    );
    
    return result;
  } catch (error) {
    console.error('❌ Failed to list images:', error);
    throw error;
  }
};

/**
 * Deletes an image from Firebase Storage
 * @param imagePath The path of the image to delete
 */
export const deleteImage = async (imagePath: string) => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    console.log('✅ Image deleted from Firebase Storage:', imagePath);
  } catch (error) {
    console.error('❌ Failed to delete image:', error);
    throw error;
  }
};

/**
 * Debug function to print all images stored in Firebase Storage
 */
export const debugPrintAllImages = async () => {
  try {
    const images = await listAllImages();
    console.log('=== STORED IMAGES ===');
    console.log(`Total images: ${images.length}`);
    
    for (const image of images) {
      console.log(`Path: ${image.path}`);
      console.log(`Metadata: ${JSON.stringify(image.metadata, null, 2)}`);
      console.log('-------------------');
    }
  } catch (error) {
    console.error('❌ Failed to debug print images:', error);
  }
};