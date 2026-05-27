export const sydneyPickupPoints = [
  {
    id: 'thaitown_main',
    label: '📍 Thai Town, Sydney (จุดนัดรับหลัก)',
    description: 'เวลาล้อหมุนมาตรฐาน (กรุณาเผื่อเวลาล่วงหน้า 15 นาที)',
  },
  {
    id: 'custom_accommodation',
    label: '🏨 ระบุที่พักของท่านในเขต CBD (เฉพาะแพ็กเกจ Private/Upgrade)',
    description: 'ช่างภาพจะวนรถไปรับถึงหน้าโรงแรมตามเวลาที่นัดหมายพิเศษ',
  },
] as const;

export type PickupPoint = (typeof sydneyPickupPoints)[number];

