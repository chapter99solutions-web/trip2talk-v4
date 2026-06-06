import GallerySlideshowGrid from './GallerySlideshowGrid';
import { useLandscapeGallery } from '../../hooks/useLandscapeGallery';

const FALLBACK_LANDSCAPE = [
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80',
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80',
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=800&q=80',
];

export default function LandscapeGalleryGrid() {
  const { urls, loading } = useLandscapeGallery();

  return (
    <GallerySlideshowGrid
      urls={urls}
      loading={loading}
      fallbackImages={FALLBACK_LANDSCAPE}
    />
  );
}
