import { useEffect, useMemo, useRef, useState } from 'react';

type Lang = 'TH' | 'EN';

type Position = 'center_bottom' | 'center' | 'bottom_right';
type FontSize = 'small' | 'medium' | 'large';

export type FBInboxTriggerProps = {
  bookingId: string;
  clientName: string;
  albumUrl: string;
  expiryDate: string;
  lang: Lang;
};

const NAVY = '#0d1b2a';
const GOLD = '#d4af37';
const TEAL = '#4dd8a0';

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fontPx(size: FontSize): number {
  if (size === 'small') return 12;
  if (size === 'large') return 18;
  return 14;
}

function positionXY(pos: Position, w: number, h: number) {
  if (pos === 'center') return { x: w / 2, y: h / 2 };
  if (pos === 'bottom_right') return { x: w - 18, y: h - 18 };
  return { x: w / 2, y: h - 18 };
}

function templateTh(clientName: string, albumUrl: string, expiryDate: string) {
  return (
    `สวัสดีครับ คุณ ${clientName} 🙏\n` +
    `รูปภาพทริปของคุณพร้อมแล้วนะครับ ✨\n` +
    `🔗 ลิงก์อัลบั้ม: ${albumUrl}\n` +
    `⏳ อัลบั้มจะหมดอายุวันที่: ${expiryDate}\n` +
    `กรุณาดาวน์โหลดก่อนวันดังกล่าวนะครับ 😊`
  );
}

function templateEn(clientName: string, albumUrl: string, expiryDate: string) {
  return (
    `Hi ${clientName} 🙏\n` +
    `Your trip photos are ready! ✨\n` +
    `🔗 Album link: ${albumUrl}\n` +
    `⏳ Album expires on: ${expiryDate}\n` +
    `Please download before the expiry date 😊`
  );
}

export default function FBInboxTrigger({ bookingId, clientName, albumUrl, expiryDate, lang: initialLang }: FBInboxTriggerProps) {
  const [lang, setLang] = useState<Lang>(initialLang);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [opacityPct, setOpacityPct] = useState(70);
  const [position, setPosition] = useState<Position>('center_bottom');
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  const messageTh = useMemo(() => templateTh(clientName, albumUrl, expiryDate), [clientName, albumUrl, expiryDate]);
  const messageEn = useMemo(() => templateEn(clientName, albumUrl, expiryDate), [clientName, albumUrl, expiryDate]);
  const message = lang === 'TH' ? messageTh : messageEn;

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = 640;
    const h = 360;
    canvas.width = w;
    canvas.height = h;

    // Background gradient
    const g = ctx.createLinearGradient(0, 0, w, h);
    g.addColorStop(0, NAVY);
    g.addColorStop(1, '#1a3a4a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // Sample photo placeholder
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(36, 36, w - 72, h - 72);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.strokeRect(36, 36, w - 72, h - 72);

    // Diagonal repeat pattern
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    ctx.translate(-w / 2, -h / 2);
    ctx.font = '10px ui-sans-serif, system-ui, -apple-system';
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    for (let y = -40; y < h + 40; y += 26) {
      for (let x = -40; x < w + 40; x += 140) {
        ctx.fillText('trip2talk.com.au', x, y);
      }
    }
    ctx.restore();

    // Watermark
    const opacity = clamp(opacityPct / 100, 0, 1);
    const sizePx = fontPx(fontSize);
    const pos = positionXY(position, w, h);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = 'white';
    ctx.font = `${sizePx}px ui-sans-serif, system-ui, -apple-system`;
    ctx.textAlign = position === 'bottom_right' ? 'right' : 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('© CHAPTER 99 PHOTOGRAPHY', pos.x, pos.y);
    ctx.restore();
  }, [opacityPct, position, fontSize]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-5" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.28em]" style={{ color: GOLD }}>
            FB INBOX TEMPLATE
          </p>
          <p className="text-xs font-mono text-white/60 mt-1">Booking: {bookingId}</p>
        </div>
        <button
          type="button"
          onClick={() => setLang((p) => (p === 'TH' ? 'EN' : 'TH'))}
          className="px-3 py-2 rounded-full text-xs font-semibold border border-white/15 bg-white/5 hover:bg-white/10"
        >
          {lang === 'TH' ? 'EN' : 'ไทย'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Message generator */}
        <div className="space-y-3">
          <p className="text-xs font-semibold" style={{ color: TEAL }}>
            Preview
          </p>
          <pre className="text-xs text-white/85 whitespace-pre-wrap font-mono rounded-2xl border border-white/10 bg-black/20 p-4">
            {message}
          </pre>
          <button
            type="button"
            onClick={() => void copy()}
            className="px-4 py-3 rounded-full text-sm font-semibold border"
            style={{ borderColor: copied ? '#34d399' : GOLD, background: copied ? '#34d399' : GOLD, color: NAVY }}
          >
            {copied ? '✅ Copied!' : '📋 Copy Message'}
          </button>
        </div>

        {/* Canvas watermark preview */}
        <div className="space-y-3">
          <p className="text-xs font-semibold" style={{ color: TEAL }}>
            Canvas watermark preview
          </p>
          <canvas ref={canvasRef} className="w-full rounded-2xl border border-white/10 bg-black/20" />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="text-xs text-white/70">
              Opacity ({opacityPct}%)
              <input
                type="range"
                min={0}
                max={100}
                value={opacityPct}
                onChange={(e) => setOpacityPct(clamp(Number(e.target.value), 0, 100))}
                className="w-full mt-2"
              />
            </label>

            <label className="text-xs text-white/70">
              Position
              <select
                className="w-full mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/90"
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
              >
                <option value="center_bottom">Center Bottom</option>
                <option value="center">Center</option>
                <option value="bottom_right">Bottom Right</option>
              </select>
            </label>

            <label className="text-xs text-white/70">
              Font size
              <select
                className="w-full mt-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-white/90"
                value={fontSize}
                onChange={(e) => setFontSize(e.target.value as FontSize)}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
          </div>

          <button
            type="button"
            onClick={() => window.alert('Looks good! (Preview only)')}
            className="px-4 py-3 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10"
          >
            ✅ Looks Good — Apply to Batch
          </button>
          <p className="text-xs text-white/50">Preview only. Actual watermark applied during export.</p>
        </div>
      </div>
    </section>
  );
}

