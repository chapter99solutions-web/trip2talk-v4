export type AlbumMode = 'model' | 'landscape';
export type LandscapePreset = 'golden' | 'waterfall' | 'milky' | 'forest';

export const MODEL_PINK = '#D4537E';
export const LANDSCAPE_TEAL = '#4dd8a0';

export interface ExpandableSpot {
  id: string;
  title: string;
  lines: { label: string; value: string }[];
}

export interface FaqItem {
  q: string;
  a: string;
}

export const MODEL_TABS = ['มุมถ่าย', 'ชุด&สไตล์', 'ไทม์ไลน์', 'FAQ'] as const;
export const LANDSCAPE_TABS = ['จุดถ่าย', 'อุปกรณ์', 'Settings', 'FAQ'] as const;

export const MODEL_SPOTS: ExpandableSpot[] = [
  {
    id: 'echo',
    title: 'Echo Point',
    lines: [
      { label: 'แสง', value: 'Golden hour หลัง sunrise 15 นาที — soft rim light' },
      { label: 'Position', value: 'ยืนห่างขอบ cliff 2m, กล้องต่ำระดับสะโพก' },
      { label: 'Angle', value: '3/4 toward valley, chin down เล็กน้อย' },
      { label: 'ชุด', value: 'Earth-tone flowy dress — ตัดกับหมอก' },
    ],
  },
  {
    id: 'leura',
    title: 'Leura Forest',
    lines: [
      { label: 'แสง', value: 'Open shade ใต้ canopy — diffused, even skin' },
      { label: 'Position', value: 'ใต้ fern arch, มือแตะใบไม้เบาๆ' },
      { label: 'Angle', value: 'Eye-level portrait, bokeh background' },
      { label: 'ชุด', value: 'Layered knit + boots — forest palette' },
    ],
  },
  {
    id: 'wentworth',
    title: 'Wentworth Falls',
    lines: [
      { label: 'แสง', value: 'Overcast หรือ soft backlight จากน้ำตก' },
      { label: 'Position', value: 'บน viewing platform ชั้นล่าง, ห่าง rail 1m' },
      { label: 'Angle', value: 'Profile with mist spray, wind in hair' },
      { label: 'ชุด', value: 'Water-resistant outer — สีเข้มไม่สะท้อนน้ำ' },
    ],
  },
  {
    id: 'sublime',
    title: 'Sublime Point',
    lines: [
      { label: 'แสง', value: 'Late afternoon side light — warm tones' },
      { label: 'Position', value: 'Rock ledge, seated pose, legs angled' },
      { label: 'Angle', value: 'Wide environmental portrait 35mm' },
      { label: 'ชุด', value: 'Structured jacket + denim — contrast sky' },
    ],
  },
];

export const MODEL_OUTFITS = [
  { title: 'Look A — Forest', desc: 'Olive knit, cream skirt, brown boots' },
  { title: 'Look B — Cliff', desc: 'Rust dress, tan belt, minimal jewellery' },
  { title: 'Look C — Waterfall', desc: 'Navy rain shell, black leggings' },
  { title: 'Look D — Sunset', desc: 'Camel coat, white tee, gold accents' },
];

export const MODEL_AVOID = [
  'ลายตารางหนา / stripe รบกวนโฟกัส',
  'ส้ม neon หรือสีสะท้อนแสงแรง',
  'รองเท้าใหม่ไม่เคยเดินป่า',
  'เครื่องประดับห้อยยาวใกล่น้ำตก',
];

export const MODEL_GEAR = ['กล้อง / มือถือ', 'Power bank', 'Hair clip & blot paper', 'Waterproof bag liner', 'Personal meds'];

export const MODEL_TIMELINE = [
  { time: '6:45 AM', text: 'Meet Warrawee · briefing & outfit check' },
  { time: '8:00 AM', text: 'Echo Point — golden portraits' },
  { time: '11:30 AM', text: 'Leura Forest — shade sets' },
  { time: '2:00 PM', text: 'Lunch break · touch-up' },
  { time: '4:30 PM', text: 'Wentworth Falls — mist shots' },
  { time: '6:30 PM', text: 'Sublime Point — sunset wide' },
  { time: '9:00 PM', text: 'Return · same-day backup reminder' },
];

export const MODEL_FAQ: FaqItem[] = [
  { q: 'แต่งหน้ายังไง?', a: 'Natural dewy — ทีมงานมี reflector ช่วย ไม่ต้อง heavy contour' },
  { q: 'เปลี่ยนชุดที่ไหน?', a: 'รถตู้ส่วนตัว + privacy screen ทุกจุดหลัก' },
  { q: 'ใครดูแล posing?', a: 'แสน (Saen) ชี้มุมมือ-เท้า และสายตา' },
  { q: 'รูปเมื่อไหร่?', a: 'Gallery .JPG ภายใน 60 วัน — ลิงก์หมดอายุอัตโนมัติ' },
];

export const LANDSCAPE_SPOTS: ExpandableSpot[] = [
  {
    id: 'echo-l',
    title: 'Echo Point',
    lines: [
      { label: 'เวลา', value: 'Blue hour → golden transition' },
      { label: 'Composition', value: 'Rule of thirds valley, foreground fern' },
      { label: 'Settings', value: 'f/8 · ISO 100 · 1/125 · AWB' },
      { label: 'Technique', value: 'Bracket if contrast high' },
    ],
  },
  {
    id: 'milky',
    title: 'Milky Way Camp',
    lines: [
      { label: 'เวลา', value: '90 min after astronomical twilight' },
      { label: 'Composition', value: 'South-facing, tent foreground interest' },
      { label: 'Settings', value: 'f/2.8 · ISO 3200 · 20s · tungsten WB' },
      { label: 'Technique', value: 'Star tracker optional · noise reduction in post' },
    ],
  },
  {
    id: 'wentworth-l',
    title: 'Wentworth Longexp',
    lines: [
      { label: 'เวลา', value: 'Overcast midday OK for silk water' },
      { label: 'Composition', value: 'Leading lines down cascade' },
      { label: 'Settings', value: 'f/11 · ISO 64 · 2.5s · ND8' },
      { label: 'Technique', value: 'Tripod mandatory · remote shutter' },
    ],
  },
  {
    id: 'sublime-t',
    title: 'Sublime Tele',
    lines: [
      { label: 'เวลา', value: 'Last light 20 min window' },
      { label: 'Composition', value: 'Compressed layers tele 70-200' },
      { label: 'Settings', value: 'f/11 · ISO 200 · 1/250 · daylight WB' },
      { label: 'Technique', value: 'Focus stack if foreground close' },
    ],
  },
];

export const LANDSCAPE_GEAR = [
  { item: 'Tripod', badge: 'required' as const },
  { item: 'Wide lens 16-35', badge: 'required' as const },
  { item: 'ND filters 6-10 stop', badge: 'recommended' as const },
  { item: 'Tele 70-200', badge: 'recommended' as const },
  { item: 'Headlamp', badge: 'optional' as const },
  { item: 'Lens cloth', badge: 'required' as const },
];

export const LENS_PER_LOCATION = [
  { spot: 'Echo Point', lens: '16-35mm' },
  { spot: 'Milky Way', lens: '14mm f/1.8' },
  { spot: 'Wentworth', lens: '24-70mm + ND' },
  { spot: 'Sublime', lens: '70-200mm' },
];

export const LANDSCAPE_SETTINGS: Record<
  LandscapePreset,
  { label: string; aperture: string; iso: string; shutter: string; wb: string; tip: string }
> = {
  golden: {
    label: 'Golden Hour',
    aperture: 'f/8 – f/11',
    iso: 'ISO 100-200',
    shutter: '1/60 – 1/250',
    wb: 'Daylight / 5200K',
    tip: 'Expose for highlights — recover shadows in .JPG workflow',
  },
  waterfall: {
    label: 'Waterfall',
    aperture: 'f/11 – f/16',
    iso: 'ISO 64-100',
    shutter: '1-4 sec (ND)',
    wb: 'Cloudy',
    tip: 'Polariser + ND8 for silk water without blowing whites',
  },
  milky: {
    label: 'Milky Way',
    aperture: 'f/1.4 – f/2.8',
    iso: 'ISO 1600-3200',
    shutter: '15-25 sec',
    wb: 'Tungsten / 3200K',
    tip: '500 rule for shutter — focus on bright star magnify',
  },
  forest: {
    label: 'Forest',
    aperture: 'f/5.6 – f/8',
    iso: 'ISO 400-800',
    shutter: '1/30 – 1/125',
    wb: 'Shade',
    tip: 'Watch green cast — slight tint fix in finished .JPG only',
  },
};

export const LANDSCAPE_FAQ: FaqItem[] = [
  { q: 'ส่ง RAW ไหม?', a: 'ไม่ส่ง — เฉพาะ .JPG สำเร็จรูปเท่านั้น' },
  { q: 'ลิงก์อัลบั้มกี่วัน?', a: '60 วันนับจากวันจบทริป แล้วหมดอายุอัตโนมัติ' },
  { q: 'Drone ได้ไหม?', a: 'เฉพาะจุดที่อนุญาตและลงทะเบียน CASA แล้ว' },
  { q: 'หารถจากไหน?', a: 'Carpool จากจุดนัด Warrawee — แจ้ง Co-Host' },
];
