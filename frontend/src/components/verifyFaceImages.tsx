import { VerificationService } from '@/services';

export async function verifyFaceImages(images: string[]) {
  return await VerificationService.verifyFaceImages(images);
}
