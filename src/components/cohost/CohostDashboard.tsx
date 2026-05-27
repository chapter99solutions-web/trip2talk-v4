import CashierPOS from './CashierPOS';

/** Co-Host terminal — trip payments & client check-in (PIN 4444). */
export default function CohostDashboard({ onLogout }: { onLogout: () => void }) {
  return <CashierPOS onLogout={onLogout} variant="cohost" />;
}