export type PhotoMediaConsent = 'marketing_yes' | 'marketing_no' | '';

export type MinorTraveller = {
  fullName: string;
  age: string;
  relationship: string;
};

export type WaiverFormData = {
  hasMedicalCondition: boolean;
  medicalConditionDetail: string;
  hasAllergy: boolean;
  allergyDetail: string;
  needsSpecialAssistance: boolean;
  specialAssistanceDetail: string;
  healthResponsibilityConsent: boolean;
  riskOutdoor: boolean;
  riskRefund: boolean;
  riskGuideCompliance: boolean;
  hasMinors: boolean;
  minors: MinorTraveller[];
  minorGuardianConsent: boolean;
  photoConsent: PhotoMediaConsent;
};

export const EMPTY_WAIVER_FORM: WaiverFormData = {
  hasMedicalCondition: false,
  medicalConditionDetail: '',
  hasAllergy: false,
  allergyDetail: '',
  needsSpecialAssistance: false,
  specialAssistanceDetail: '',
  healthResponsibilityConsent: false,
  riskOutdoor: false,
  riskRefund: false,
  riskGuideCompliance: false,
  hasMinors: false,
  minors: [{ fullName: '', age: '', relationship: '' }],
  minorGuardianConsent: false,
  photoConsent: '',
};

export function isWaiverFormValid(data: WaiverFormData): boolean {
  if (data.hasMedicalCondition && !data.medicalConditionDetail.trim()) return false;
  if (data.hasAllergy && !data.allergyDetail.trim()) return false;
  if (data.needsSpecialAssistance && !data.specialAssistanceDetail.trim()) return false;
  if (!data.healthResponsibilityConsent) return false;
  if (!data.riskOutdoor || !data.riskRefund || !data.riskGuideCompliance) return false;
  if (!data.photoConsent) return false;

  if (data.hasMinors) {
    if (!data.minorGuardianConsent) return false;
    const validMinors = data.minors.filter(
      (m) => m.fullName.trim() && m.age.trim() && m.relationship.trim()
    );
    if (validMinors.length === 0) return false;
  }

  return true;
}

export function photoConsentFromWaiver(data: WaiverFormData): boolean {
  return data.photoConsent === 'marketing_yes';
}

export function buildMedicalNotesFromWaiver(data: WaiverFormData): string {
  const lines: string[] = [];
  if (data.hasMedicalCondition && data.medicalConditionDetail.trim()) {
    lines.push(`โรคประจำตัว: ${data.medicalConditionDetail.trim()}`);
  }
  if (data.hasAllergy && data.allergyDetail.trim()) {
    lines.push(`แพ้ยา/อาหาร: ${data.allergyDetail.trim()}`);
  }
  if (data.needsSpecialAssistance && data.specialAssistanceDetail.trim()) {
    lines.push(`ความช่วยเหลือพิเศษ: ${data.specialAssistanceDetail.trim()}`);
  }
  if (data.hasMinors) {
    const minors = data.minors
      .filter((m) => m.fullName.trim())
      .map(
        (m) =>
          `${m.fullName.trim()} (อายุ ${m.age.trim()}, ${m.relationship.trim()})`
      );
    if (minors.length) lines.push(`ผู้เยาว์: ${minors.join('; ')}`);
  }
  if (data.photoConsent === 'marketing_no') {
    lines.push('ไม่ยินยอมใช้ภาพเพื่อการโปรโมท — อัลบั้มส่วนตัวเท่านั้น');
  }
  return lines.join('\n');
}
