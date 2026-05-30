import { useI18n } from '../../lib/i18n';
import { SEASON_PREP_CARDS } from '../../lib/seasonPrepGuide';

export default function SeasonPrepSection() {
  const { lang } = useI18n();
  const isTh = lang === 'TH';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {SEASON_PREP_CARDS.map((card) => (
        <article
          key={card.id}
          className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-400 uppercase">
                {isTh ? card.monthsTh : card.monthsEn}
              </p>
              <h3 className="font-serif text-xl font-semibold text-slate-900 mt-1">
                {card.emoji} {isTh ? card.labelTh : card.labelEn}
              </h3>
            </div>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                {isTh ? 'ทริปแนะนำ' : 'Best trips'}
              </dt>
              <dd className="text-slate-600 mt-0.5">{isTh ? card.bestTripsTh : card.bestTripsEn}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {isTh ? 'ชุด / Outfit' : 'Outfit'}
              </dt>
              <dd className="text-slate-600 mt-0.5">{isTh ? card.outfitTh : card.outfitEn}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {isTh ? 'เมคอัพ' : 'Makeup'}
              </dt>
              <dd className="text-slate-600 mt-0.5">{isTh ? card.makeupTh : card.makeupEn}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {isTh ? 'แสงที่ดีที่สุด' : 'Best light'}
              </dt>
              <dd className="text-slate-600 mt-0.5">{isTh ? card.bestLightTh : card.bestLightEn}</dd>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {isTh ? 'เคล็ดลับ' : 'Tip'}
              </dt>
              <dd className="text-slate-700 mt-0.5 leading-relaxed">{isTh ? card.tipTh : card.tipEn}</dd>
            </div>
          </dl>
        </article>
      ))}
    </div>
  );
}
