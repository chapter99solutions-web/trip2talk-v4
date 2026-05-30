import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import InstallPrompt from './components/pwa/InstallPrompt';
import OfflineBanner from './components/shared/OfflineBanner';
import PublicShell from './components/layout/PublicShell';
import ProtectedRoute from './components/ProtectedRoute';
import { useDashboardLogout } from './components/ops/DashboardLogout';
import { getStoredRole } from './lib/sessionRole';

const PublicPortfolio = lazy(() => import('./pages/PublicPortfolio'));
const ClientPortal = lazy(() => import('./pages/ClientPortal'));
const TourDetail = lazy(() => import('./pages/TourDetail'));
const BookingCheckout = lazy(() => import('./pages/BookingCheckout'));
const ClientVIPHub = lazy(() => import('./pages/ClientVIPHub'));
const AlbumPrep = lazy(() => import('./pages/AlbumPrep'));
const AlbumPrepGate = lazy(() => import('./pages/AlbumPrepGate'));
const PhotoDeliveryTerms = lazy(() => import('./pages/PhotoDeliveryTerms'));
const TravelPackageTerms = lazy(() => import('./pages/TravelPackageTerms'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Saved = lazy(() => import('./pages/Saved'));
const PINGate = lazy(() => import('./components/PINGate'));
const StaffDashboard = lazy(() => import('./components/staff/StaffDashboard'));
const CohostDashboard = lazy(() => import('./components/cohost/CohostDashboard'));
const OwnerDashboard = lazy(() => import('./components/owner/OwnerDashboard'));
const PlatformHub = lazy(() => import('./components/superadmin/PlatformHub'));
const CmsPage = lazy(() => import('./pages/Cms'));

function PageFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy">
      <div className="w-10 h-10 border-4 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function StaffDashboardRoute() {
  const onLogout = useDashboardLogout();
  return (
    <ProtectedRoute requiredRole="staff">
      <StaffDashboard onLogout={onLogout} />
    </ProtectedRoute>
  );
}

function CohostDashboardRoute() {
  const onLogout = useDashboardLogout();
  return (
    <ProtectedRoute requiredRole="cohost">
      <CohostDashboard onLogout={onLogout} />
    </ProtectedRoute>
  );
}

function OwnerDashboardRoute() {
  const onLogout = useDashboardLogout();
  return (
    <ProtectedRoute requiredRole="owner">
      <OwnerDashboard onLogout={onLogout} />
    </ProtectedRoute>
  );
}

function PlatformDashboardRoute() {
  const onLogout = useDashboardLogout();
  return (
    <ProtectedRoute requiredRole="platform">
      <PlatformHub onLogout={onLogout} />
    </ProtectedRoute>
  );
}

function CmsRoute() {
  const onLogout = useDashboardLogout();
  const stored = getStoredRole();
  if (stored !== 'owner' && stored !== 'platform') {
    return <Navigate to="/ops" replace />;
  }
  return <CmsPage onLogout={onLogout} />;
}

export default function App() {
  return (
    <>
      <InstallPrompt />
      <BrowserRouter>
        <OfflineBanner />
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* PUBLIC */}
            <Route path="/" element={<PublicPortfolio />} />
            <Route path="/portal" element={<ClientPortal />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/saved" element={<Saved />} />
            <Route path="/album/:tourId" element={<AlbumPrep />} />
            <Route path="/album-prep" element={<AlbumPrepGate />} />
            <Route element={<PublicShell />}>
              <Route path="/tours/:tourId" element={<TourDetail />} />
              <Route path="/trips" element={<PublicPortfolio />} />
              <Route path="/book/:tourId" element={<BookingCheckout />} />
              <Route path="/trip/:bookingRef" element={<ClientVIPHub />} />
              <Route path="/pass/:bookingId" element={<ClientVIPHub />} />
              <Route path="/terms" element={<PhotoDeliveryTerms />} />
              <Route path="/package-terms" element={<TravelPackageTerms />} />
            </Route>

            {/* Legacy client portal URL */}
            <Route path="/dashboard" element={<Navigate to="/portal" replace />} />

            {/* OPS PIN + protected dashboards */}
            <Route path="/ops" element={<PINGate />} />
            {/* Convenience aliases → all land on the ops PIN gate */}
            <Route path="/admin" element={<Navigate to="/ops" replace />} />
            <Route path="/staff" element={<Navigate to="/ops" replace />} />
            <Route path="/dashboard/staff" element={<StaffDashboardRoute />} />
            <Route path="/dashboard/cohost" element={<CohostDashboardRoute />} />
            <Route path="/dashboard/owner" element={<OwnerDashboardRoute />} />
            <Route path="/dashboard/platform" element={<PlatformDashboardRoute />} />

            <Route path="/cms" element={<CmsRoute />} />
            <Route path="/cms/*" element={<CmsRoute />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
}
