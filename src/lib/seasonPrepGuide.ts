import type { TripSeason } from './masterTrips';

export type SeasonPrepCard = {
  id: Exclude<TripSeason, 'all'>;
  emoji: string;
  labelEn: string;
  labelTh: string;
  monthsEn: string;
  monthsTh: string;
  bestTripsEn: string;
  bestTripsTh: string;
  outfitEn: string;
  outfitTh: string;
  makeupEn: string;
  makeupTh: string;
  bestLightEn: string;
  bestLightTh: string;
  tipEn: string;
  tipTh: string;
  tourCodes: string[];
};

export const SEASON_PREP_CARDS: SeasonPrepCard[] = [
  {
    id: 'autumn',
    emoji: '🍂',
    labelEn: 'Autumn',
    labelTh: 'ใบไม้ร่วง',
    monthsEn: 'Mar–May',
    monthsTh: 'มี.ค.–พ.ค.',
    bestTripsEn: 'MEL-4D3N (foliage), NZ-6D5N Autumn route',
    bestTripsTh: 'MEL-4D3N (ใบไม้เปลี่ยนสี), NZ-6D5N เส้นทางฤดูใบไม้ร่วง',
    outfitEn: 'Warm tones — burgundy, rust brown, mustard',
    outfitTh: 'โทนวอร์ม เบอร์กันดี้ น้ำตาลอิฐ มัสตาร์ด',
    makeupEn: 'Dark red / Mauve lips · Bronze Copper eyeshadow',
    makeupTh: 'ปากสีดาร์กเรด Mauve / อายแชโดว์ Bronze Copper',
    bestLightEn: 'Golden Hour 5:45 PM',
    bestLightTh: 'Golden Hour 17:45 น.',
    tipEn: 'Warm burgundy tones contrast beautifully with autumn foliage',
    tipTh: 'เสื้อโทนอุ่นตัดกับใบไม้สีส้ม ผ้าพันคอเพิ่มมิติ',
    tourCodes: ['MEL-4D3N', 'NZ-6D5N'],
  },
  {
    id: 'winter',
    emoji: '❄️',
    labelEn: 'Winter',
    labelTh: 'ฤดูหนาว',
    monthsEn: 'Jun–Aug',
    monthsTh: 'มิ.ย.–ส.ค.',
    bestTripsEn: 'KIA-1DAY, TAS-3D2N (Aurora), NZ-6D5N Winter route',
    bestTripsTh: 'KIA-1DAY, TAS-3D2N (ออโรร่า), NZ-6D5N เส้นทางฤดูหนาว',
    outfitEn: 'Navy, Charcoal, Deep Green, Camel Coat',
    outfitTh: 'โทนเข้ม Navy, Charcoal, Deep Green, Camel Coat',
    makeupEn: 'Blush pink or Berry lips · deep black eyeliner',
    makeupTh: 'ปากสีชมพูบลัชชี่ หรือ Berry / อายไลเนอร์สีดำเข้ม',
    bestLightEn: 'Blue Hour 7:00 AM / Golden Hour 4:30 PM (very short)',
    bestLightTh: 'Blue Hour 07:00 น. / Golden Hour 16:30 น. (สั้นมาก)',
    tipEn: 'Deep navy and charcoal against crisp winter sky creates luxury contrast',
    tipTh: 'ท้องฟ้าสีครามใสหลังฝนหยุด เสื้อหนาวเข้มตัดกับฟ้าสวยมาก',
    tourCodes: ['KIA-1DAY', 'TAS-3D2N', 'NZ-6D5N'],
  },
  {
    id: 'spring',
    emoji: '🌸',
    labelEn: 'Spring',
    labelTh: 'ฤดูใบไม้ผลิ',
    monthsEn: 'Sep–Nov',
    monthsTh: 'ก.ย.–พ.ย.',
    bestTripsEn: 'CAN-2D1N (Canola Fields), NZ-6D5N Spring route',
    bestTripsTh: 'CAN-2D1N (ทุ่งคาโนล่า), NZ-6D5N เส้นทางฤดูใบไม้ผลิ',
    outfitEn: 'White, cream, soft blue, pastel yellow',
    outfitTh: 'โทนขาว ครีม ฟ้าอ่อน เหลืองพาสเทล',
    makeupEn: 'Coral / Peach lips · peach blush',
    makeupTh: 'ปาก Coral / Peach · แก้มสีพีช',
    bestLightEn: 'Soft morning 8:00 AM / Golden Hour 6:30 PM',
    bestLightTh: 'แสงเช้านุ่ม 08:00 น. / Golden Hour 18:30 น.',
    tipEn: 'Pastel wardrobe against golden canola creates editorial spring colour',
    tipTh: 'ชุดพาสเทลตัดกับทุ่งดอกเหลือง — ภาพสดใสแบบนิตยสาร',
    tourCodes: ['CAN-2D1N', 'NZ-6D5N'],
  },
  {
    id: 'summer',
    emoji: '☀️',
    labelEn: 'Summer',
    labelTh: 'ฤดูร้อน',
    monthsEn: 'Dec–Feb',
    monthsTh: 'ธ.ค.–ก.พ.',
    bestTripsEn: 'TAS-LH-4D3N (Lavender), ULU-4D3N, SYD-1DAY',
    bestTripsTh: 'TAS-LH-4D3N (ลาเวนเดอร์), ULU-4D3N, SYD-1DAY',
    outfitEn: 'White linen, cream, soft navy — avoid heavy dark layers',
    outfitTh: 'โทนขาว ลินิน ครีม ฟ้ากรม — หลีกเลี่ยงสีเข้มหนัก',
    makeupEn: 'Bronze / glossy lips · light dewy base',
    makeupTh: 'โทนส้ม Bronze / Lip Gloss ใส',
    bestLightEn: 'Early morning 6:30 AM / sunset 7:30 PM',
    bestLightTh: 'เช้า 06:30 น. / พระอาทิตย์ตก 19:30 น.',
    tipEn: 'Light linen and cream tones read beautifully in harsh summer light',
    tipTh: 'ชุดลินินสีอ่อนถ่ายกับทุ่งลาเวนเดอร์และชายหาดได้มิติ',
    tourCodes: ['TAS-LH-4D3N', 'ULU-4D3N', 'SYD-1DAY'],
  },
];
