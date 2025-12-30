/**
 * CLOUDINARY BACKUP - Image Upload Functions
 * 
 * This file contains the original Cloudinary upload logic.
 * Keep this as a backup in case you want to switch back to Cloudinary.
 * 
 * To use Cloudinary again:
 * 1. Import this function instead of uploadToFirebaseStorage
 * 2. Replace all uploadToFirebaseStorage calls with uploadToCloudinaryBase64
 * 3. Update your Cloudinary credentials below
 */

// Cloudinary (unsigned) config - set these to your values
const CLOUDINARY_CLOUD_NAME = 'dtvzsivnl';
const CLOUDINARY_UPLOAD_PRESET = 'notespark';
const CLOUDINARY_FOLDER = 'notespark';

/**
 * Uploads base64 image to Cloudinary via unsigned preset and returns the secure URL
 * @param base64 Base64 encoded image data (without data URI prefix)
 * @param mimeType MIME type of the image (e.g., 'image/jpeg')
 * @param options Upload options including folder path
 * @returns Cloudinary secure URL
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
 * USAGE EXAMPLES:
 * 
 * For profile images:
 * const url = await uploadToCloudinaryBase64(
 *   asset.base64, 
 *   asset.mimeType || "image/jpeg", 
 *   { folder: `notespark/${userId}/avatars` }
 * );
 * 
 * For note images:
 * const url = await uploadToCloudinaryBase64(
 *   asset.base64,
 *   asset.mimeType || "image/jpeg",
 *   { folder: `notespark/${userId}/notes` }
 * );
 */

/**
 * FILES TO UPDATE IF SWITCHING BACK TO CLOUDINARY:
 * 
 * 1. components/modals/ImageCaptureModal.tsx
 *    - Line 14: import { uploadToCloudinaryBase64 } from "../../utils/imageStorage";
 *    - Line 151: const url = await uploadToCloudinaryBase64(base64, mimeType, { folder });
 * 
 * 2. components/modals/ProfileModal.tsx
 *    - Line 6: import { uploadToCloudinaryBase64 } from "../../utils/imageStorage";
 *    - Line 93: const url = await uploadToCloudinaryBase64(asset.base64, ...);
 * 
 * 3. components/NotesContent.tsx
 *    - Line 40: import { uploadToCloudinaryBase64 } from "../utils/imageStorage";
 *    - Lines 816, 861, 986, 1022: Replace uploadToFirebaseStorage with uploadToCloudinaryBase64
 */
