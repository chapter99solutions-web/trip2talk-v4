import CashierPOS from './CashierPOS';
import AlbumDeliveryPanel from '../shared/AlbumDeliveryPanel';

/** Co-Host terminal — trip payments & client check-in (PIN 4444). */
export default function CohostDashboard({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#0d1b2a]">
      <CashierPOS onLogout={onLogout} variant="cohost" />
      <div className="max-w-6xl mx-auto px-6 pb-10">
        <AlbumDeliveryPanel theme="light" />
      </div>
    </div>
  );
}