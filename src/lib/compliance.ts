import { CRMClient, Tour } from '../types/tour';
import { OSHCValidation } from '../types/compliance';
export const WAIVER_TEXT = {
  EN: {
    title: 'Private Photo Journey Liability Waiver & Safety Agreement',
    terms: 'I agree to follow all staff instructions and safety requirements during the private photo journey.',
    risk: 'I acknowledge inherent risks of travel and photography activities and accept responsibility.',
    medical: 'I authorize emergency medical treatment if required during the trip.',
    media: 'I consent to photographic and video recording. I understand delivery is final edited .JPG only (no RAW files) and album links expire after 60 days.',
    privacy: 'I confirm my visa and personal details match official documents.',
    cancellation:
      'I accept trip tiers (Standard 4–6 guests, Private 1–3 guests Guaranteed Departure; solo = Private rate) and the cancellation policy: owner cancellation <45 days before departure — 100% refund; client cancellation >90d 10% fee, 61–90d 30%, 31–60d 50%, ≤30d no refund.',
  },
  TH: {
    title: 'หนังสือยินยอมสละสิทธิ์ความรับผิดชอบและข้อตกลงความปลอดภัย',
    terms: 'ข้าพเจ้ายินยอมปฏิบัติตามคำแนะนำของทีมงานและข้อปฏิบัติด้านความปลอดภัยตลอดทริปถ่ายภาพแบบส่วนตัว',
    risk: 'ข้าพเจ้ารับทราบความเสี่ยงของการเดินทางและกิจกรรมถ่ายภาพ และยอมรับความรับผิดชอบ',
    medical: 'ข้าพเจ้ายินยอมให้มีการรักษาพยาบาลฉุกเฉินหากจำเป็นระหว่างทริป',
    media: 'ข้าพเจ้ายินยอมให้ถ่ายภาพ/วิดีโอ และรับทราบว่าจะส่งมอบเฉพาะไฟล์ .JPG สำเร็จรูปเท่านั้น (ไม่ส่งไฟล์ RAW) และลิงก์อัลบั้มหมดอายุภายใน 60 วัน',
    privacy: 'ข้าพเจ้ายืนยันว่าข้อมูลวีซ่าและข้อมูลส่วนตัวตรงกับเอกสารทางการ',
    cancellation:
      'ข้าพเจ้ายอมรับระดับทริป (Standard 4–6 คน, Private 1–3 คน Guaranteed Departure — เดินคนเดียวใช้ราคา Private) และนโยบายยกเลิก: ยกเลิกโดยพี่แสน <45 วันก่อนออกทริป คืน 100%; ลูกค้ายกเลิก >90 วัน หัก 10%, 61–90 หัก 30%, 31–60 หัก 50%, ≤30 วัน ไม่คืน',
  },
} as const;

export type WaiverLanguage = keyof typeof WAIVER_TEXT;
export const validateOSHC = (client: CRMClient, tour: Tour): OSHCValidation => {
  const warnings: string[] = [];
  const expiry = new Date(client.oshc_expiry);
  const tourEnd = new Date(tour.end_date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (expiry < today) {
    warnings.push(`OSHC expired on ${client.oshc_expiry}`);
  } else if (expiry < tourEnd) {
    warnings.push(`OSHC expires before trip end (${client.oshc_expiry} vs ${tour.end_date})`);
  }

  return {
    is_valid: warnings.length === 0,
    days_remaining: Math.max(0, daysRemaining),
    warnings,
  };
};
