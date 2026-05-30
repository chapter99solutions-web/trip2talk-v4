import { useEffect, useState } from 'react';
import { submitClientIntake } from '../lib/tripsSheetApi';

export interface IntakeFormData {
  fullName: string;
  dob: string;
  emergencyName: string;
  emergencyPhone: string;
  dietary: string[];
  dietaryOther: string;
  medical: string;
  motionSickness: 'yes' | 'no' | '';
  photoStyle: string[];
}

export interface IntakeFormModalProps {
  bookingId: string;
  tourCode: string;
  language: 'TH' | 'EN';
  defaultFullName?: string;
  /** When false, backdrop click does not close the modal (required intake). */
  dismissible?: boolean;
  onComplete: (data: IntakeFormData) => void;
}

const DIETARY_OPTIONS = [
  { id: 'none', th: 'ไม่มีข้อจำกัด', en: 'None' },
  { id: 'vegetarian', th: 'มังสวิรัติ (Vegetarian)', en: 'Vegetarian' },
  { id: 'vegan', th: 'วีแกน (Vegan)', en: 'Vegan' },
  { id: 'seafood_allergy', th: 'แพ้อาหารทะเล', en: 'Seafood Allergy' },
  { id: 'halal', th: 'ฮาลาล (Halal)', en: 'Halal' },
  { id: 'other', th: 'อื่นๆ (โปรดระบุ)', en: 'Other (please specify)' },
];

const PHOTO_STYLE_OPTIONS = [
  { id: 'candid', th: 'แคนดิด ธรรมชาติ', en: 'Candid / Natural', emoji: '🌿' },
  { id: 'fashion', th: 'แฟชั่น โพสต์สวย', en: 'Fashion / Posed', emoji: '👗' },
  { id: 'landscape', th: 'แลนด์สเคป อลังการ', en: 'Epic Landscape', emoji: '🏔️' },
  { id: 'cafe', th: 'คาเฟ่ ไลฟ์สไตล์', en: 'Café / Lifestyle', emoji: '☕' },
];

export default function IntakeFormModal({
  bookingId,
  tourCode,
  language: initialLang,
  defaultFullName = '',
  dismissible = true,
  onComplete,
}: IntakeFormModalProps) {
  const [lang, setLang] = useState(initialLang);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState<IntakeFormData>({
    fullName: defaultFullName,
    dob: '',
    emergencyName: '',
    emergencyPhone: '',
    dietary: [],
    dietaryOther: '',
    medical: '',
    motionSickness: '',
    photoStyle: [],
  });

  useEffect(() => {
    setLang(initialLang);
  }, [initialLang]);

  useEffect(() => {
    if (defaultFullName && !form.fullName) {
      setForm((f) => ({ ...f, fullName: defaultFullName }));
    }
  }, [defaultFullName, form.fullName]);

  const setField = <K extends keyof IntakeFormData>(key: K, val: IntakeFormData[K]) => {
    setForm((f) => ({ ...f, [key]: val }));
  };

  const toggleDietary = (id: string) => {
    setForm((f) => {
      let next = [...f.dietary];
      if (id === 'none') {
        next = next.includes('none') ? [] : ['none'];
      } else {
        next = next.filter((x) => x !== 'none');
        next = next.includes(id) ? next.filter((x) => x !== id) : [...next, id];
      }
      return { ...f, dietary: next };
    });
  };

  const togglePhotoStyle = (id: string) => {
    setForm((f) => {
      const arr = f.photoStyle;
      return {
        ...f,
        photoStyle: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id],
      };
    });
  };

  const needsDietaryOther = form.dietary.includes('other');
  const canNext1 =
    form.fullName.trim().length > 1 &&
    form.dob !== '' &&
    form.emergencyName.trim().length > 1 &&
    form.emergencyPhone.trim().length > 6;

  const canNext2 =
    form.dietary.length > 0 &&
    form.motionSickness !== '' &&
    (!needsDietaryOther || form.dietaryOther.trim().length > 1);

  const canSubmit = form.photoStyle.length > 0;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitClientIntake({ bookingId, tourCode, ...form });
    } catch (e) {
      console.error('Intake submit error:', e);
    }
    setSubmitting(false);
    setDone(true);
    setTimeout(() => onComplete(form), 1800);
  };

  const inputCls =
    'w-full text-sm border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 bg-white transition-all';

  const labelCls = 'block text-xs font-semibold text-gray-600 mb-1.5';

  if (done) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{lang === 'TH' ? 'เยี่ยมมากครับ! 🎉' : 'All set! 🎉'}</h2>
          <p className="text-sm text-gray-500">
            {lang === 'TH'
              ? 'ข้อมูลของคุณถูกบันทึกแล้ว พร้อมเช็คอินได้เลย'
              : 'Your info is saved. You can now check in!'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={dismissible ? undefined : (e) => e.stopPropagation()}
    >
      <div
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-teal-600 uppercase tracking-wider mb-1">
                {lang === 'TH' ? 'ก่อนเช็คอิน — ใช้เวลา 2 นาที' : 'Before Check-in — 2 minutes'}
              </p>
              <h2 className="text-lg font-bold text-gray-900">
                {lang === 'TH' ? '✨ ปรับทริปให้เหมาะกับคุณ' : '✨ Personalize Your Photo Trip'}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setLang(lang === 'TH' ? 'EN' : 'TH')}
              className="text-xs border border-gray-200 rounded-full px-3 py-1.5 font-semibold text-gray-500 flex-shrink-0"
            >
              {lang === 'TH' ? 'EN' : 'ไทย'}
            </button>
          </div>

          <div className="flex gap-2 mt-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  s === step ? 'bg-teal-500 flex-1' : s < step ? 'bg-teal-200 w-8' : 'bg-gray-200 w-8'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-1">{lang === 'TH' ? `ขั้นตอน ${step} จาก 3` : `Step ${step} of 3`}</p>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={labelCls} htmlFor="intake-fullName">
                  {lang === 'TH' ? 'ชื่อ-นามสกุลเต็ม (ตามพาสปอร์ต)' : 'Full legal name (as on passport)'}
                </label>
                <input
                  id="intake-fullName"
                  className={inputCls}
                  value={form.fullName}
                  onChange={(e) => setField('fullName', e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div>
                <label className={labelCls} htmlFor="intake-dob">
                  {lang === 'TH' ? 'วันเกิด' : 'Date of birth'}
                </label>
                <input
                  id="intake-dob"
                  type="date"
                  className={inputCls}
                  value={form.dob}
                  onChange={(e) => setField('dob', e.target.value)}
                />
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-700 mb-3">
                  {lang === 'TH' ? '🆘 ผู้ติดต่อฉุกเฉิน' : '🆘 Emergency contact'}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className={labelCls} htmlFor="intake-emergencyName">
                      {lang === 'TH' ? 'ชื่อผู้ติดต่อ' : 'Contact name'}
                    </label>
                    <input
                      id="intake-emergencyName"
                      className={inputCls}
                      value={form.emergencyName}
                      onChange={(e) => setField('emergencyName', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="intake-emergencyPhone">
                      {lang === 'TH' ? 'เบอร์โทร (รวมรหัสประเทศ)' : 'Phone (with country code)'}
                    </label>
                    <input
                      id="intake-emergencyPhone"
                      type="tel"
                      className={inputCls}
                      placeholder="+61 ..."
                      value={form.emergencyPhone}
                      onChange={(e) => setField('emergencyPhone', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className={labelCls}>{lang === 'TH' ? '🍽️ ข้อจำกัดอาหาร' : '🍽️ Dietary requirements'}</p>
                <div className="space-y-2">
                  {DIETARY_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleDietary(opt.id)}
                      className={`w-full text-left text-sm px-4 py-3 rounded-xl border transition-all ${
                        form.dietary.includes(opt.id)
                          ? 'border-teal-500 bg-teal-50 text-teal-900 font-medium'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      {lang === 'TH' ? opt.th : opt.en}
                    </button>
                  ))}
                </div>
                {needsDietaryOther && (
                  <input
                    className={`${inputCls} mt-2`}
                    placeholder={lang === 'TH' ? 'ระบุข้อจำกัดอาหาร' : 'Specify dietary needs'}
                    value={form.dietaryOther}
                    onChange={(e) => setField('dietaryOther', e.target.value)}
                  />
                )}
              </div>

              <div>
                <label className={labelCls} htmlFor="intake-medical">
                  {lang === 'TH' ? '⚕️ ข้อมูลสุขภาพ / แพ้ยา (ถ้ามี)' : '⚕️ Health / allergies (optional)'}
                </label>
                <textarea
                  id="intake-medical"
                  rows={3}
                  className={inputCls}
                  value={form.medical}
                  onChange={(e) => setField('medical', e.target.value)}
                  placeholder={
                    lang === 'TH' ? 'เช่น แพ้ยาแก้ปวด, โรคประจำตัว' : 'e.g. medication allergies, conditions'
                  }
                />
              </div>

              <div>
                <p className={labelCls}>{lang === 'TH' ? '🚗 เมารถ / เรือ' : '🚗 Motion sickness'}</p>
                <div className="flex gap-2">
                  {(['yes', 'no'] as const).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setField('motionSickness', v)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all ${
                        form.motionSickness === v
                          ? 'border-teal-500 bg-teal-50 text-teal-800'
                          : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      {v === 'yes'
                        ? lang === 'TH'
                          ? 'มี / ต้องการที่นั่งหน้า'
                          : 'Yes — prefer front seat'
                        : lang === 'TH'
                          ? 'ไม่มี'
                          : 'No'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                {lang === 'TH'
                  ? 'เลือกสไตล์ภาพที่ชอบ (เลือกได้มากกว่า 1) — ทีมจะปรับการถ่ายให้เหมาะกับคุณ'
                  : 'Pick your photo vibes (select all that apply) — we tailor the shoot to you.'}
              </p>
              <div className="grid grid-cols-2 gap-2">
                {PHOTO_STYLE_OPTIONS.map((opt) => {
                  const selected = form.photoStyle.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => togglePhotoStyle(opt.id)}
                      className={`p-4 rounded-2xl border text-left transition-all ${
                        selected
                          ? 'border-teal-500 bg-teal-50 ring-2 ring-teal-200'
                          : 'border-gray-200 bg-white'
                      }`}
                    >
                      <span className="text-2xl block mb-1">{opt.emoji}</span>
                      <span className="text-xs font-semibold text-gray-800 leading-snug block">
                        {lang === 'TH' ? opt.th : opt.en}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1 py-3.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600"
            >
              {lang === 'TH' ? 'ย้อนกลับ' : 'Back'}
            </button>
          )}
          {step < 3 ? (
            <button
              type="button"
              disabled={(step === 1 && !canNext1) || (step === 2 && !canNext2)}
              onClick={() => setStep((s) => s + 1)}
              className="flex-1 py-3.5 rounded-xl bg-teal-500 text-white text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {lang === 'TH' ? 'ถัดไป' : 'Next'}
            </button>
          ) : (
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={() => void handleSubmit()}
              className="flex-1 py-3.5 rounded-xl bg-[#1C1C1E] text-white text-sm font-bold disabled:opacity-40"
            >
              {submitting
                ? lang === 'TH'
                  ? 'กำลังบันทึก…'
                  : 'Saving…'
                : lang === 'TH'
                  ? 'บันทึก & เช็คอิน'
                  : 'Save & continue'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
