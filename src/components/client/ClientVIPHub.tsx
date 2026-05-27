import React, { useState } from 'react';
import { CRMClient, Tour } from '../../types/tour';
import { WAIVER_TEXT } from '../../lib/compliance';
export default function ClientVIPHub({ client, tour }: { client: CRMClient; tour: Tour }) {
  const [signed, setSigned] = useState(false);
  const [sigText, setSigText] = useState('');
  const [chk, setChk] = useState(false);

  return (
    <div className="max-w-md mx-auto bg-neutral-900 border border-neutral-800 rounded-3xl overflow-hidden p-5 text-xs space-y-4">
      <div><h3 className="font-bold text-sm text-amber-400">{client.first_name_en} {client.last_name_en}</h3><p className="text-neutral-500 font-mono">Compliance Gateway Module</p></div>
      <div className="bg-neutral-950 border border-neutral-800 p-3 rounded-xl max-h-36 overflow-y-auto text-neutral-400 font-sans leading-relaxed">
        <h5 className="font-bold text-neutral-200 text-[11px] mb-1">{WAIVER_TEXT.EN.title}</h5><p>{WAIVER_TEXT.EN.terms}</p>
        <h5 className="font-bold text-neutral-200 text-[11px] mt-2 mb-1">{WAIVER_TEXT.TH.title}</h5><p>{WAIVER_TEXT.TH.terms}</p>
      </div>
      {signed ? (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-center font-bold">✓ WAIVER SIGNATURE SECURELY RECORDED</div>
      ) : (
        <div className="space-y-3">
          <label className="flex items-start gap-2 text-neutral-300"><input type="checkbox" checked={chk} onChange={e=>setChk(e.target.checked)} className="accent-amber-500 mt-0.5" /><span>I authorize and explicitly accept all strict liability constraints / ยอมรับข้อตกลง</span></label>
          <input type="text" value={sigText} onChange={e=>setSigText(e.target.value)} placeholder="Type Legal English Passport Name String" className="w-full bg-neutral-950 border border-neutral-800 p-2.5 rounded-xl text-neutral-100 focus:outline-none font-mono" />
          <button disabled={!chk || !sigText.trim()} onClick={()=>setSigned(true)} className="w-full py-2.5 bg-amber-500 text-neutral-950 font-bold rounded-xl uppercase disabled:opacity-30">Sign Compliance Record</button>
        </div>
      )}
    </div>
  );
}
