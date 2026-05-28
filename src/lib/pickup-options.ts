export const sydneyPickupPoints = [
  {
    id: 'central_station',
    label: '🚉 Central Station (Wake Up Hostel / Pitt St entrance)',
    description: 'จุดนัดรับหลัก — ใกล้ทางออก Pitt St เวลามาตรฐาน',
  },
  {
    id: 'town_hall',
    label: '🏛 Town Hall (Rydges World Square / George St)',
    description: 'จอดรถหน้า Rydges World Square ฝั่ง George St',
  },
  {
    id: 'thaitown_main',
    label: '📍 Thai Town, Sydney (Dixon St / Sussex St)',
    description: 'จุดนัดรับหลักสำหรับลูกทริปชาวไทย — เผื่อเวลา 15 นาที',
  },
  {
    id: 'custom_accommodation',
    label: '🏨 ระบุที่พักของท่านในเขต CBD (เฉพาะแพ็กเกจ Private/Upgrade)',
    description: 'ช่างภาพวนรถไปรับถึงหน้าโรงแรม — ต้องระบุชื่อและที่อยู่',
  },
] as const;

export type PickupPoint = (typeof sydneyPickupPoints)[number];
export type PickupId = PickupPoint['id'];

export function pickupEmoji(pickupId: string | null | undefined): string {
  switch (pickupId) {
    case 'custom_accommodation':
      return '🏨';
    case 'central_station':
      return '🚉';
    case 'town_hall':
      return '🏛';
    default:
      return '📍';
  }
}

export function pickupShortLabel(pickupId: string | null | undefined): string {
  const point = sydneyPickupPoints.find((p) => p.id === pickupId);
  if (!point) return pickupId ?? '—';
  return point.label.split('(')[0].trim();
}
