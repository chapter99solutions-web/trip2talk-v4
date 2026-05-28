import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import InstallPrompt from './components/pwa/InstallPrompt';
import OfflineBanner from './components/shared/OfflineBanner';
import PublicShell from './components/layout/PublicShell';

const PublicPortfolio = lazy(() => import('./pages/PublicPortfolio'));
const TourDetail = lazy(() => import('./pages/TourDetail'));
const BookingCheckout = lazy(() => import('./pages/BookingCheckout'));
const ClientVIPHub = lazy(() => import('./pages/ClientVIPHub'));
const AlbumPrep = lazy(() => import('./pages/AlbumPrep'));
const PhotoDeliveryTerms = lazy(() => import('./pages/PhotoDeliveryTerms'));
const TravelPackageTerms = lazy(() => import('./pages/TravelPackageTerms'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const OwnerDashboard = lazy(() => import('./components/owner/OwnerDashboard'));
const OpsApp = lazy(() => import('./components/OpsApp'));

function OwnerDashboardRoute() {
  const navigate = useNavigate();
  return <OwnerDashboard onLogout={() => navigate('/', { replace: true })} />;
}

function PageFallback() {
  return (
    <div className="min-h-[40vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-[color:var(--gold)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <>
      <InstallPrompt />
      <BrowserRouter>
        <OfflineBanner />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* PUBLIC — no PIN */}
            <Route path="/" element={<PublicPortfolio />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/album/:tourId" element={<AlbumPrep />} />
            <Route element={<PublicShell />}>
              <Route path="/tours/:tourId" element={<TourDetail />} />
              <Route path="/trips" element={<PublicPortfolio />} />
              <Route path="/book/:tourId" element={<BookingCheckout />} />
              <Route path="/trip/:bookingRef" element={<ClientVIPHub />} />
              <Route path="/pass/:bookingId" element={<ClientVIPHub />} />
              <Route path="/terms" element={<PhotoDeliveryTerms />} />
              <Route path="/package-terms" element={<TravelPackageTerms />} />
            </Route>

            {/* PROTECTED — PIN → role dashboard */}
            <Route path="/dashboard" element={<OwnerDashboardRoute />} />
            <Route path="/dashboard/*" element={<OpsApp />} />
            <Route path="/ops/*" element={<Navigate to="/dashboard" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}
