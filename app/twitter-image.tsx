import {
  createShareImage,
  shareImageAlt,
  shareImageContentType,
  shareImageSize,
} from './share-card-image';

export const alt = shareImageAlt;
export const size = shareImageSize;
export const contentType = shareImageContentType;

export default function Image() {
  return createShareImage();
}
