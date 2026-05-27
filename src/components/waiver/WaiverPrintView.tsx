import { WaiverData } from '../../types/compliance';
import { CRMClient, Tour } from '../../types/tour';
import { WAIVER_TEXT } from '../../lib/compliance';

interface WaiverPrintViewProps {
  waiver: WaiverData;
  client: CRMClient;
  tour: Tour;
}

const CLAUSE_KEYS = ['terms', 'risk', 'medical', 'media', 'privacy', 'cancellation'] as const;

function formatSignedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function WaiverPrintView({ waiver, client, tour }: WaiverPrintViewProps) {
  const clientEn = `${client.first_name_en} ${client.last_name_en}`;
  const clientTh = `${client.first_name_th} ${client.last_name_th}`;

  return (
    <div className="waiver-print-root bg-white text-black p-8 max-w-[210mm] mx-auto text-sm leading-relaxed">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .waiver-print-root, .waiver-print-root * { visibility: visible !important; }
          .waiver-print-root {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
          }
        }
      `}</style>

      <header className="border-b-2 border-black pb-4 mb-6">
        <h1 className="text-2xl font-bold tracking-wide">Trip2Talk Australia</h1>
        <p className="text-xs mt-1">ABN: XX XXX XXX XXX</p>
        <p className="text-xs mt-2 font-semibold">Liability Waiver — Signed Record</p>
      </header>

      <section className="mb-6">
        <h2 className="font-bold text-base mb-2 uppercase">Trip Details</h2>
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr className="border-b border-neutral-300">
              <td className="py-1 pr-4 font-semibold w-36">Trip Code</td>
              <td className="py-1">{tour.trip_code}</td>
            </tr>
            <tr className="border-b border-neutral-300">
              <td className="py-1 pr-4 font-semibold">Destination</td>
              <td className="py-1">{tour.destination}</td>
            </tr>
            <tr className="border-b border-neutral-300">
              <td className="py-1 pr-4 font-semibold">Dates</td>
              <td className="py-1">
                {tour.start_date} — {tour.end_date}
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-4 font-semibold">Status</td>
              <td className="py-1">{tour.status}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-base mb-2 uppercase">Client Details</h2>
        <table className="w-full border-collapse text-xs">
          <tbody>
            <tr className="border-b border-neutral-300">
              <td className="py-1 pr-4 font-semibold w-36">Name (EN)</td>
              <td className="py-1">{clientEn}</td>
            </tr>
            <tr className="border-b border-neutral-300">
              <td className="py-1 pr-4 font-semibold">Name (TH)</td>
              <td className="py-1">{clientTh}</td>
            </tr>
            <tr className="border-b border-neutral-300">
              <td className="py-1 pr-4 font-semibold">Passport</td>
              <td className="py-1">{client.passport_number}</td>
            </tr>
            <tr className="border-b border-neutral-300">
              <td className="py-1 pr-4 font-semibold">Visa</td>
              <td className="py-1">{client.visa_status.replace(/_/g, ' ')}</td>
            </tr>
            <tr>
              <td className="py-1 pr-4 font-semibold">OSHC Expiry</td>
              <td className="py-1">{client.oshc_expiry}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-base mb-3 uppercase">Waiver Clauses</h2>
        <div className="space-y-4">
          {CLAUSE_KEYS.map((key, i) => (
            <div key={key} className="border border-neutral-300 p-3 rounded">
              <p className="font-bold text-xs mb-2">Clause {i + 1}</p>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="font-semibold mb-1">English</p>
                  <p>{WAIVER_TEXT.EN[key]}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">ไทย</p>
                  <p>{WAIVER_TEXT.TH[key]}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-6">
        <h2 className="font-bold text-base mb-2 uppercase">Digital Signature</h2>
        <img
          src={waiver.digital_signature}
          alt="Client signature"
          className="max-h-24 border border-neutral-400 rounded p-2"
        />
        <p className="text-xs mt-3">
          <span className="font-semibold">Signed at:</span> {formatSignedAt(waiver.signed_at)}
        </p>
      </section>

      <footer className="text-xs text-neutral-600 border-t border-neutral-300 pt-4">
        This document was digitally signed via Trip2Talk V4 PWA
      </footer>
    </div>
  );
}
