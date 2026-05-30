import GallerySlideshowGrid from './GallerySlideshowGrid';
import { useSeasonGallery } from '../../hooks/useSeasonGallery';

const FALLBACK_SEASON = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=80',
  'https://images.unsplash.com/photo-1514395462725-7b8b0e7f0870?w=800&q=80',
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80',
];

export default function SeasonGalleryGrid() {
  const { urls, loading } = useSeasonGallery();

  return (
    <GallerySlideshowGrid
      urls={urls}
      loading={loading}
      fallbackImages={FALLBACK_SEASON}
    />
  );
}
