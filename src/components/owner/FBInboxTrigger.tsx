import { useMemo, useRef, useState } from 'react';

type Lang = 'TH' | 'EN';

type Props = {
  customerName: string;
  albumUrl: string;
  expiryDate: string;
  lang?: Lang;
};

export default function FBInboxTrigger({
  customerName,
  albumUrl,
  expiryDate,
  lang = 'TH',
}: Props) {
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const messageTh = useMemo(
    () =>
      `สวัสดีครับ คุณ ${customerName} 🙏\nรูปภาพทริปของคุณพร้อมแล้วนะครับ ✨\n🔗 ลิงก์อัลบั้ม: ${albumUrl}\n⏳ อัลบั้มจะหมดอายุวันที่: ${expiryDate}\nกรุณาดาวน์โหลดก่อนวันดังกล่าวนะครับ 😊`,
    [albumUrl, customerName, expiryDate]
  );

  const messageEn = useMemo(
    () =>
      `Hi ${customerName} 🙏\nYour trip photos are ready ✨\n🔗 Album: ${albumUrl}\n⏳ Expires: ${expiryDate}\nPlease download before this date 😊`,
    [albumUrl, customerName, expiryDate]
  );

  const message = lang === 'TH' ? messageTh : messageEn;

  const drawWatermarkPreview = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = 640;
    const h = 360;
    canvas.width = w;
    canvas.height = h;
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(212, 175, 55, 0.35)';
    ctx.font = '24px serif';
    ctx.fillText('Trip2Talk · Chapter 99', w - 280, h - 40);
    ctx.strokeStyle = 'rgba(77, 216, 160, 0.5)';
    ctx.strokeRect(12, 12, w - 24, h - 24);
  };

  const copy = async () => {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    drawWatermarkPreview();
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="cyber-card p-4 space-y-3">
      <p className="text-xs text-gold font-semibold uppercase tracking-wide">
        {lang === 'TH' ? 'เทมเพลต FB Inbox' : 'FB Inbox template'}
      </p>
      <pre className="text-xs text-neutral-300 whitespace-pre-wrap font-mono bg-black/30 p-3 rounded-lg border border-white/10">
        {message}
      </pre>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void copy()} className="cyber-btn-gold text-xs">
          {copied ? (lang === 'TH' ? 'คัดลอกแล้ว' : 'Copied') : lang === 'TH' ? 'คัดลอกข้อความ' : 'Copy to Clipboard'}
        </button>
      </div>
      <p className="text-xs text-neutral-500">
        {lang === 'TH' ? 'ตัวอย่างตำแหน่งลายน้ำ 16:9 ก่อนซิงก์ Drive' : '16:9 watermark position preview before Drive sync'}
      </p>
      <canvas ref={canvasRef} className="w-full rounded-lg border border-white/10" />
    </div>
  );
}
