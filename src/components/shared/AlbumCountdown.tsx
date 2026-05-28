interface Props {
  expiresAt: string;
}

export default function AlbumCountdown({ expiresAt }: Props) {
  const daysLeft = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  const isUrgent = daysLeft <= 14;
  const isCritical = daysLeft <= 7;

  const bg = isCritical
    ? 'bg-[#FCEBEB] border-[#F09595]'
    : isUrgent
      ? 'bg-[#FAEEDA] border-[#EF9F27]'
      : 'bg-[#E1F5EE] border-[#5DCAA5]';

  const text = isCritical ? 'text-[#791F1F]' : isUrgent ? 'text-[#633806]' : 'text-[#085041]';

  const pct = Math.min(100, Math.max(0, Math.round((daysLeft / 60) * 100)));

  const barBg = isCritical ? 'bg-[#E24B4A]' : isUrgent ? 'bg-[#EF9F27]' : 'bg-[#1D9E75]';

  return (
    <div className={`border rounded-xl p-4 mb-4 ${bg}`}>
      <div className={`flex justify-between items-center mb-2 ${text}`}>
        <span className="text-sm font-semibold">
          {isCritical
            ? `🚨 ด่วนมาก! เหลือเวลาอีกแค่ ${daysLeft} วัน`
            : isUrgent
              ? `⚠️ เหลือเวลาอีก ${daysLeft} วัน — ดาวน์โหลดด่วนนะครับ`
              : `📸 คลังภาพพร้อมแล้ว เหลือเวลา ${daysLeft} วัน`}
        </span>
        <span className="text-xs opacity-70">{daysLeft}/60 วัน</span>
      </div>
      <div className="w-full bg-white/60 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barBg}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isUrgent && (
        <p className={`text-xs mt-2 leading-relaxed ${text}`}>
          ระบบจะลบไฟล์ออกจากคลังออนไลน์ภายในอีก {daysLeft} วัน — กรุณาดาวน์โหลดและสำรองไฟล์ .JPG
          ไว้ในอุปกรณ์ส่วนตัวด้วยนะครับ
        </p>
      )}
    </div>
  );
}
