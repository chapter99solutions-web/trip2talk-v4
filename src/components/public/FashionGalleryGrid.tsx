import GallerySlideshowGrid from './GallerySlideshowGrid';
import { useFashionGallery } from '../../hooks/useFashionGallery';

const FALLBACK_FASHION = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=800&q=80',
  'https://images.unsplash.com/photo-1496747611176-843222e1ad94?w=800&q=80',
];

export default function FashionGalleryGrid() {
  const { urls, loading } = useFashionGallery();

  return (
    <GallerySlideshowGrid
      urls={urls}
      loading={loading}
      fallbackImages={FALLBACK_FASHION}
    />
  );
}
