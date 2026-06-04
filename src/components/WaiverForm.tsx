import {
  EMPTY_WAIVER_FORM,
  type MinorTraveller,
  type WaiverFormData,
} from '../types/waiverForm';

type Props = {
  value: WaiverFormData;
  onChange: (next: WaiverFormData) => void;
};

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </div>
  );
}

function ToggleDetailRow({
  label,
  checked,
  onCheckedChange,
  detail,
  onDetailChange,
  detailPlaceholder,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  detail: string;
  onDetailChange: (value: string) => void;
  detailPlaceholder: string;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-1 accent-teal shrink-0"
        />
        <span>{label}</span>
      </label>
      {checked && (
        <input
          value={detail}
          onChange={(e) => onDetailChange(e.target.value)}
          placeholder={detailPlaceholder}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
        />
      )}
    </div>
  );
}

function RiskRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-teal shrink-0"
      />
      <span>{label}</span>
    </label>
  );
}

export default function WaiverForm({ value, onChange }: Props) {
  const patch = (partial: Partial<WaiverFormData>) => onChange({ ...value, ...partial });

  const updateMinor = (index: number, partial: Partial<MinorTraveller>) => {
    const minors = value.minors.map((row, i) => (i === index ? { ...row, ...partial } : row));
    patch({ minors });
  };

  const addMinor = () => {
    patch({ minors: [...value.minors, { fullName: '', age: '', relationship: '' }] });
  };

  const removeMinor = (index: number) => {
    if (value.minors.length <= 1) {
      patch({ minors: [{ fullName: '', age: '', relationship: '' }] });
      return;
    }
    patch({ minors: value.minors.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-xl font-semibold text-slate-900">หนังสือยินยอม &amp; Consent</h2>
        <p className="text-sm text-slate-500 mt-1">
          กรุณาอ่านและยืนยันทุกข้อที่จำเป็นก่อนยืนยันการจอง
        </p>
      </div>

      <SectionCard title="1. ข้อมูลสุขภาพ / Health Information">
        <ToggleDetailRow
          label="มีโรคประจำตัวหรือไม่?"
          checked={value.hasMedicalCondition}
          onCheckedChange={(hasMedicalCondition) =>
            patch({
              hasMedicalCondition,
              medicalConditionDetail: hasMedicalCondition ? value.medicalConditionDetail : '',
            })
          }
          detail={value.medicalConditionDetail}
          onDetailChange={(medicalConditionDetail) => patch({ medicalConditionDetail })}
          detailPlaceholder="ระบุโรคประจำตัว / medical condition"
        />
        <ToggleDetailRow
          label="แพ้ยาหรืออาหารหรือไม่?"
          checked={value.hasAllergy}
          onCheckedChange={(hasAllergy) =>
            patch({ hasAllergy, allergyDetail: hasAllergy ? value.allergyDetail : '' })
          }
          detail={value.allergyDetail}
          onDetailChange={(allergyDetail) => patch({ allergyDetail })}
          detailPlaceholder="ระบุยา/อาหารที่แพ้ / allergies"
        />
        <ToggleDetailRow
          label="ต้องการความช่วยเหลือพิเศษหรือไม่?"
          checked={value.needsSpecialAssistance}
          onCheckedChange={(needsSpecialAssistance) =>
            patch({
              needsSpecialAssistance,
              specialAssistanceDetail: needsSpecialAssistance ? value.specialAssistanceDetail : '',
            })
          }
          detail={value.specialAssistanceDetail}
          onDetailChange={(specialAssistanceDetail) => patch({ specialAssistanceDetail })}
          detailPlaceholder="ระบุความช่วยเหลือที่ต้องการ / special assistance"
        />
        <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={value.healthResponsibilityConsent}
            onChange={(e) => patch({ healthResponsibilityConsent: e.target.checked })}
            className="mt-1 accent-teal shrink-0"
          />
          <span>
            ข้าพเจ้ายินยอมรับผิดชอบด้านสุขภาพของตนเองระหว่างทริป
            <span className="text-red-600"> *</span>
          </span>
        </label>
      </SectionCard>

      <SectionCard title="2. การรับทราบความเสี่ยง / Risk Acknowledgement">
        <RiskRow
          label="รับทราบว่าทริปมีกิจกรรม outdoor และสภาพอากาศอาจเปลี่ยนแปลง"
          checked={value.riskOutdoor}
          onChange={(riskOutdoor) => patch({ riskOutdoor })}
        />
        <RiskRow
          label="รับทราบ refund policy: 60+ วัน คืน 90% / 31-60 วัน คืน 50% / น้อยกว่า 30 วัน ไม่คืน"
          checked={value.riskRefund}
          onChange={(riskRefund) => patch({ riskRefund })}
        />
        <RiskRow
          label="ยินยอมปฏิบัติตามคำแนะนำของช่างภาพและทีมงานตลอดทริป"
          checked={value.riskGuideCompliance}
          onChange={(riskGuideCompliance) => patch({ riskGuideCompliance })}
        />
      </SectionCard>

      <SectionCard title="3. ผู้เดินทางที่เป็นผู้เยาว์ / Minor Travellers">
        <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value.hasMinors}
            onChange={(e) => {
              const hasMinors = e.target.checked;
              patch({
                hasMinors,
                minors: hasMinors ? value.minors : EMPTY_WAIVER_FORM.minors,
                minorGuardianConsent: hasMinors ? value.minorGuardianConsent : false,
              });
            }}
            className="mt-1 accent-teal shrink-0"
          />
          <span>มีผู้เยาว์อายุต่ำกว่า 18 ปีร่วมเดินทางหรือไม่?</span>
        </label>

        {value.hasMinors && (
          <div className="space-y-3 pt-1">
            {value.minors.map((minor, index) => (
              <div
                key={`minor-${index}`}
                className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    ผู้เยาว์ #{index + 1}
                  </p>
                  {value.minors.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeMinor(index)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      ลบ
                    </button>
                  )}
                </div>
                <input
                  value={minor.fullName}
                  onChange={(e) => updateMinor(index, { fullName: e.target.value })}
                  placeholder="ชื่อ-นามสกุล"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={minor.age}
                    onChange={(e) => updateMinor(index, { age: e.target.value })}
                    placeholder="อายุ"
                    inputMode="numeric"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
                  />
                  <input
                    value={minor.relationship}
                    onChange={(e) => updateMinor(index, { relationship: e.target.value })}
                    placeholder="ความสัมพันธ์กับผู้จอง"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-teal/30"
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addMinor}
              className="text-sm font-semibold text-teal hover:underline"
            >
              + เพิ่มผู้เยาว์
            </button>
            <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={value.minorGuardianConsent}
                onChange={(e) => patch({ minorGuardianConsent: e.target.checked })}
                className="mt-1 accent-teal shrink-0"
              />
              <span>
                ในฐานะผู้ปกครอง ข้าพเจ้ายินยอมและรับผิดชอบผู้เยาว์ตลอดทริป
                <span className="text-red-600"> *</span>
              </span>
            </label>
          </div>
        )}
      </SectionCard>

      <SectionCard title="4. ยินยอมภาพถ่าย &amp; สื่อ / Photo &amp; Media Consent">
        <p className="text-xs text-slate-500">เลือก 1 ตัวเลือก / select one option *</p>
        <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-slate-800 cursor-pointer">
          <input
            type="radio"
            name="photoConsent"
            checked={value.photoConsent === 'marketing_yes'}
            onChange={() => patch({ photoConsent: 'marketing_yes' })}
            className="mt-1 accent-teal shrink-0"
          />
          <span>✅ ยินยอมให้ถ่ายภาพและใช้เพื่อโปรโมท Trip2Talk</span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-slate-800 cursor-pointer">
          <input
            type="radio"
            name="photoConsent"
            checked={value.photoConsent === 'marketing_no'}
            onChange={() => patch({ photoConsent: 'marketing_no' })}
            className="mt-1 accent-teal shrink-0"
          />
          <span>
            ⚠️ ไม่ยินยอมให้ใช้ภาพเพื่อการโปรโมท — รับเฉพาะอัลบั้มส่วนตัวเท่านั้น
          </span>
        </label>
      </SectionCard>
    </div>
  );
}
