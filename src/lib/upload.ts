import type { ImagePickerAsset } from 'expo-image-picker';
import { fetch } from 'expo/fetch';
import { Platform } from 'react-native';
import { siteUrl } from './social';

export async function readUploadBlob(uri: string, maxBytes: number, fallbackMime: string) {
  const response = await fetch(uri);
  if (!response.ok) throw new Error('Unable to read the selected file. Please choose it again.');
  const raw = await response.blob();
  if (!raw.size || raw.size > maxBytes) {
    throw new Error(`Choose a file under ${maxBytes / 1024 / 1024} MB.`);
  }
  const mime = response.headers.get('content-type')?.split(';')[0]?.trim() || fallbackMime;
  return raw.slice(0, raw.size, mime);
}

export async function uploadProfilePicture(blob: Blob, token: string) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const imageBase64 = `data:${blob.type};base64,${encodeBase64(bytes)}`;
  const response = await fetch(`${siteUrl}/auth/profile-picture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'x-chefu-app': 'nook',
    },
    body: JSON.stringify({ imageBase64, contentType: blob.type }),
  });
  const responseText = await response.text();
  let result: { url?: string; message?: string | string[] } = {};
  if (responseText.trim()) {
    try {
      result = JSON.parse(responseText) as typeof result;
    } catch {
      if (response.ok) throw new Error('The profile photo service returned an invalid response.');
    }
  }
  if (!response.ok) {
    const message = Array.isArray(result.message) ? result.message.join(' ') : result.message;
    throw new Error(message || `Profile photo upload failed (${response.status}).`);
  }
  if (!result.url) throw new Error('The profile photo service returned no photo URL.');
  return result.url;
}

function encodeBase64(bytes: Uint8Array) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const chunks: string[] = [];
  let chunk = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const hasSecond = index + 1 < bytes.length;
    const hasThird = index + 2 < bytes.length;
    const second = hasSecond ? bytes[index + 1] : 0;
    const third = hasThird ? bytes[index + 2] : 0;
    chunk += alphabet[first >> 2];
    chunk += alphabet[((first & 3) << 4) | (second >> 4)];
    chunk += hasSecond ? alphabet[((second & 15) << 2) | (third >> 6)] : '=';
    chunk += hasThird ? alphabet[third & 63] : '=';
    if (chunk.length >= 4096) {
      chunks.push(chunk);
      chunk = '';
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks.join('');
}

export function validateMedia(asset: ImagePickerAsset, avatar = false) {
  const video = asset.type === 'video';
  if (avatar && video) throw new Error('Choose a photo for your avatar.');
  if (!asset.width || !asset.height) throw new Error('Unable to read media dimensions. Select a different file.');
  const max = (avatar ? 5 : video ? 50 : 10) * 1024 * 1024;
  if (asset.fileSize != null && asset.fileSize > max) throw new Error(`Choose a file under ${max / 1024 / 1024} MB.`);
  if (video && (!asset.duration || asset.duration > 30_000)) throw new Error('Choose a video no longer than 30 seconds.');
  const mime = asset.mimeType?.toLowerCase() ?? (video ? 'video/mp4' : 'image/jpeg');
  if (!(video ? ['video/mp4', 'video/quicktime'] : ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']).includes(mime)) {
    throw new Error('Choose a JPG, PNG, WebP, HEIC photo or an MP4/MOV video.');
  }
  return {
    kind: video ? 'video' as const : 'image' as const,
    width: asset.width,
    height: asset.height,
    ...(video ? { duration: asset.duration! / 1000 } : {}),
    mime,
    max,
  };
}

export function sendUpload(
  id: string,
  uri: string,
  mimeType: string,
  blob: Blob | null,
  token: string,
  progress: (value: number) => void,
  signal?: AbortSignal,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    if (Platform.OS === 'web') {
      if (!blob) {
        reject(new Error('Unable to prepare the selected file. Please choose it again.'));
        return;
      }
      form.append('file', blob, 'upload');
    } else {
      appendNativeFile(form, { uri, name: 'upload', type: mimeType });
    }
    const abort = () => xhr.abort();
    signal?.addEventListener('abort', abort);
    const cleanup = () => signal?.removeEventListener('abort', abort);
    xhr.open('POST', `${siteUrl}/nook/uploads/${encodeURIComponent(id)}/file`);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.setRequestHeader('x-chefu-app', 'nook');
    xhr.timeout = 180_000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(event.loaded / event.total); };
    xhr.onload = () => {
      cleanup();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(xhr.responseText || 'Upload failed. Please retry.'));
    };
    xhr.onerror = () => { cleanup(); reject(new Error('Upload failed. Check your connection and retry.')); };
    xhr.ontimeout = () => { cleanup(); reject(new Error('Upload timed out. Please retry.')); };
    xhr.onabort = () => { cleanup(); reject(new Error('Upload cancelled.')); };
    if (signal?.aborted) { cleanup(); reject(new Error('Upload cancelled.')); return; }
    xhr.send(form);
  });
}

function appendNativeFile(form: FormData, file: { uri: string; name: string; type: string }) {
  const nativeForm = form as FormData & {
    append(name: string, value: { uri: string; name: string; type: string }): void;
  };
  nativeForm.append('file', file);
}
