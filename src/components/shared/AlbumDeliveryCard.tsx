import { useState } from 'react';

export interface AlbumDeliveryBooking {
  booking_ref: string;
  client_name: string;
  tour_title: string;
  album_url: string;
  facebook_chat_url?: string | null;
}

interface Props {
  booking: AlbumDeliveryBooking;
}

export default function AlbumDeliveryCard({ booking }: Props) {
  const [copied, setCopied] = useState(false);

  const message = `สวัสดีครับ คุณ${booking.client_name} 🎉\n\nภาพถ่ายทริป "${booking.tour_title}" ของคุณพร้อมดาวน์โหลดแล้วครับ!\n\n📸 กดลิงก์นี้เพื่อดูและดาวน์โหลดภาพทั้งหมด:\n${booking.album_url}\n\n⏳ ลิงก์นี้จะหมดอายุใน 60 วัน กรุณาดาวน์โหลดเก็บไว้ในอุปกรณ์ส่วนตัวด้วยนะครับ\n\nขอบคุณมากที่ไว้วางใจ Trip2Talk นะครับ 🙏\n— แสน (Chapter 99 Photography)`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      /* fallback: user can select from <pre> */
    }
  };

  return (
    <div className="bg-[#E1F5EE] border border-[#5DCAA5] rounded-xl p-4 mt-4">
      <p className="text-sm font-semibold text-[#085041] mb-2">📋 ข้อความส่ง Facebook Inbox พร้อมแล้ว</p>
      <pre className="text-xs text-[#0F6E56] bg-white border border-[#5DCAA5] rounded-lg p-3 whitespace-pre-wrap leading-relaxed mb-3 select-all">
        {message}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#0d1b2a] text-white hover:bg-[#1a3a5a] transition-all"
        >
          {copied ? '✅ คัดลอกแล้ว!' : '📋 คัดลอกข้อความส่งสมาชิกลูกทริป'}
        </button>
        {booking.facebook_chat_url && (
          <a
            href={booking.facebook_chat_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-[#1877F2] text-white hover:opacity-90 transition-all"
          >
            💬 เปิด Messenger
          </a>
        )}
      </div>
    </div>
  );
}
