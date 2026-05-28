import AlbumCountdown from './AlbumCountdown';
import type { AlbumStatus } from '../../lib/albumDelivery';

interface Props {
  albumStatus: AlbumStatus;
  albumUrl?: string | null;
  albumExpiresAt?: string | null;
  bookingRef: string;
  onExpressRequest?: (tier: '3day' | '24h') => void;
}

export default function PhotoDeliveryTracker({
  albumStatus,
  albumUrl,
  albumExpiresAt,
  bookingRef,
  onExpressRequest,
}: Props) {
  const statusCopy: Record<AlbumStatus, string> = {
    pending: '📸 ช่างภาพรับงานแล้ว รอเริ่ม Edit',
    processing: '🎨 กำลัง Edit สีและแต่งภาพ (โดยทั่วไป 7–14 วัน)',
    delivered: '📸 คลังภาพพร้อมดาวน์โหลดแล้ว',
    expired: '⏰ ลิงก์หมดอายุแล้ว — ติดต่อพี่แสนทาง Messenger',
  };

  return (
    <div className="bg-white rounded-[28px] border border-sage-100 shadow-sm p-4 space-y-3">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-[#9A9A9A] uppercase">Photo delivery</p>
      <p className="text-sm font-semibold text-[#1C1C1E]">{statusCopy[albumStatus]}</p>
      <p className="text-xs text-[#6B6B6B]">Booking {bookingRef}</p>

      {albumStatus === 'delivered' && albumExpiresAt && <AlbumCountdown expiresAt={albumExpiresAt} />}

      {albumStatus === 'delivered' && albumUrl && (
        <a
          href={albumUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full justify-center rounded-[18px] bg-[#1C1C1E] text-white py-3 text-sm font-semibold hover:bg-neutral-800"
        >
          เปิดคลังภาพดาวน์โหลด
        </a>
      )}

      {albumStatus === 'processing' && onExpressRequest && (
        <div className="flex flex-col sm:flex-row gap-2 pt-1">
          <button
            type="button"
            onClick={() => onExpressRequest('3day')}
            className="flex-1 rounded-[18px] border border-sage-200 px-3 py-2.5 text-sm font-semibold hover:bg-sage-50"
          >
            +A$80 รับภายใน 3 วัน
          </button>
          <button
            type="button"
            onClick={() => onExpressRequest('24h')}
            className="flex-1 rounded-[18px] border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-900"
          >
            +A$150 รับพรุ่งนี้
          </button>
        </div>
      )}
    </div>
  );
}
