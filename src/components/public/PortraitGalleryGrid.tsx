import GallerySlideshowGrid from './GallerySlideshowGrid';
import { useModelGallery } from '../../hooks/useModelGallery';

const FALLBACK_PORTRAIT = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800&q=80',
];

export default function PortraitGalleryGrid() {
  const { urls, loading } = useModelGallery();

  return (
    <GallerySlideshowGrid
      urls={urls}
      loading={loading}
      fallbackImages={FALLBACK_PORTRAIT}
    />
  );
}
