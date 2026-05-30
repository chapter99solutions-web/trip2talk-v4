import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import LanguageToggle from '../components/i18n/LanguageToggle';
import PublicBottomNav from '../components/public/PublicBottomNav';
import { useI18n } from '../lib/i18n';
import { forwardSheetPayload } from '../lib/syncPipeline';

const CORPORATE_ADDRESS = 'Chapter 99 Photography, Warrawee NSW 2074, Australia';
const EMAIL = 'trip2talksyd@gmail.com';
const FACEBOOK_PAGE_URL = 'https://www.facebook.com/TriptoTalk';
const CONTACT_HERO_IMAGE =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Ulruru/11.jpg';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  message: string;
};

async function postContact(payload: Record<string, unknown>): Promise<void> {
  const result = await forwardSheetPayload('sync_booking', 'CONTACT', {
    passthrough: true,
    ...payload,
  });
  if (!result.success) {
    throw new Error(result.error);
  }
}

export default function Contact() {
  const { t } = useI18n();
  const [form, setForm] = useState<FormState>({
    firstName: '',
    lastName: '',
    email: '',
    message: '',
  });
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const mailtoHref = useMemo(() => {
    const subject = `Trip2Talk enquiry — ${form.firstName} ${form.lastName}`.trim();
    const body = `Name: ${form.firstName} ${form.lastName}\nEmail: ${form.email}\n\n${form.message}`.trim();
    return `mailto:${EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [form.email, form.firstName, form.lastName, form.message]);

  const canSend =
    form.firstName.trim() &&
    form.lastName.trim() &&
    /^\S+@\S+\.\S+$/.test(form.email.trim()) &&
    form.message.trim();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend || busy) return;
    setBusy(true);
    setOk(false);
    setErr(null);
    try {
      await postContact({
        sheet: 'Consents',
        consent: {
          timestampIso: new Date().toISOString(),
          bookingId: 'CONTACT',
          customerName: `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
          tourCode: 'CONTACT',
          consentStatus: 'CONTACT_FORM',
          email: form.email.trim(),
          message: form.message.trim(),
          source: 'web',
        },
      });
      setOk(true);
      setForm({ firstName: '', lastName: '', email: '', message: '' });
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : 'Send failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-navy font-sans antialiased pb-24">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="font-serif text-xl font-semibold text-navy tracking-tight">
            Trip2Talk
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link to="/#tours" className="hover:text-teal transition-colors">
              {t('nav_trips')}
            </Link>
            <Link to="/about" className="hover:text-teal transition-colors">
              {t('nav_about')}
            </Link>
            <Link to="/contact" className="text-gold font-semibold">
              {t('nav_contact')}
            </Link>
            <Link to="/package-terms" className="hover:text-teal transition-colors">
              {t('nav_terms')}
            </Link>
          </nav>
          <LanguageToggle variant="light" />
        </div>
      </header>

      <div className="w-full px-4 pt-4">
        <div className="relative w-full h-[350px] rounded-2xl overflow-hidden max-w-6xl mx-auto">
          <img
            src={CONTACT_HERO_IMAGE}
            alt=""
            className="w-full h-full object-cover object-center"
            loading="eager"
            fetchPriority="high"
          />
          <div
            className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"
            aria-hidden
          />
        </div>
      </div>

      <section className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-3xl mx-auto px-4 py-14 md:py-20 text-center">
          <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
            {t('contact_kicker')}
          </p>
          <h1 className="mt-4 font-serif text-4xl md:text-5xl font-semibold text-navy leading-tight">
            {t('contact_title')}
          </h1>
          <p className="mt-5 text-base md:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            {t('contact_lead')}
          </p>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-2 gap-10">
        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
            <h2 className="font-serif text-2xl font-semibold text-navy">{t('contact_channels')}</h2>
            <p className="mt-2 text-sm text-slate-600">
              {t('contact_lead')}
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <a
                href={FACEBOOK_PAGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-3 rounded-2xl bg-messenger px-5 py-4 text-white font-semibold text-sm hover:opacity-95 transition-opacity"
              >
                <span className="text-lg" aria-hidden>
                  💬
                </span>
                {t('contact_messenger')}
              </a>
              <a
                href={`mailto:${EMAIL}`}
                className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-navy bg-white px-5 py-4 text-navy font-semibold text-sm hover:bg-navy hover:text-white transition-colors"
              >
                <span className="text-lg" aria-hidden>
                  ✉️
                </span>
                {EMAIL}
              </a>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-navy text-white p-6 md:p-8">
            <h2 className="font-serif text-2xl font-semibold text-gold">{t('contact_studio_title')}</h2>
            <p className="mt-4 text-sm text-slate-300 leading-relaxed">
              <span className="text-xs uppercase tracking-widest text-teal block mb-2">
                {t('contact_address_label')}
              </span>
              {CORPORATE_ADDRESS}
            </p>
            <p className="mt-4 text-xs text-slate-400">{t('contact_privacy_note')}</p>
          </div>
        </section>

        <section>
          <div className="rounded-3xl border border-slate-200 bg-white shadow-sm p-6 md:p-8">
            <h2 className="font-serif text-2xl font-semibold text-navy">{t('contact_form_title')}</h2>

            {ok && (
              <p className="mt-4 rounded-2xl border border-teal/30 bg-teal/10 px-4 py-3 text-sm text-navy">
                {t('contact_sent_ok')}
              </p>
            )}
            {err && (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {err}{' '}
                <a href={mailtoHref} className="underline font-semibold">
                  {EMAIL}
                </a>
              </p>
            )}

            <form className="mt-6 space-y-4" onSubmit={(e) => void submit(e)}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600">First name *</label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
                    value={form.firstName}
                    onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                    autoComplete="given-name"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600">Last name *</label>
                  <input
                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
                    value={form.lastName}
                    onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                    autoComplete="family-name"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Email *</label>
                <input
                  type="email"
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal/40"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600">Message *</label>
                <textarea
                  className="mt-2 w-full min-h-36 rounded-2xl border border-slate-200 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal/40"
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                />
              </div>
              <button
                type="submit"
                disabled={!canSend || busy}
                className="w-full rounded-full bg-gold text-navy font-semibold py-3.5 text-sm hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                {busy ? '…' : t('contact_send')}
              </button>
            </form>
          </div>
        </section>
      </main>

      <PublicBottomNav />
    </div>
  );
}
