import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

export async function uploadPintPhoto(uid: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg';
  const filename = `${Date.now()}.${ext}`;
  const storageRef = ref(storage, `pints/${uid}/${filename}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
