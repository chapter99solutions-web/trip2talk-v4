import { useEffect, useMemo, useState } from 'react';

import { Link, useSearchParams } from 'react-router-dom';

import { validatePortalToken, type PlatformBooking } from '../lib/platformBookings';



const NAVY = '#0d1b2a';

const GOLD = '#d4af37';

const TEAL = '#4dd8a0';



const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;



type GateState = 'loading' | 'deny' | 'ok';



export default function AlbumPrepGate() {

  const [search] = useSearchParams();

  const token = (search.get('token') || '').trim();

  const [gate, setGate] = useState<GateState>('loading');

  const [booking, setBooking] = useState<PlatformBooking | null>(null);

  const [expiresAt, setExpiresAt] = useState<string | null>(null);



  useEffect(() => {

    if (!token || !UUID_V4.test(token)) {

      setGate('deny');

      return;

    }



    let cancelled = false;

    const run = async () => {

      setGate('loading');

      const result = await validatePortalToken(token);

      if (cancelled) return;



      if (!result.ok || !result.booking) {

        setGate('deny');

        setBooking(null);

        setExpiresAt(result.expiresAt);

        return;

      }



      setBooking(result.booking);

      setExpiresAt(result.expiresAt);

      setGate('ok');

    };



    void run();

    return () => {

      cancelled = true;

    };

  }, [token]);



  const title = useMemo(() => {

    return booking?.trip_name || booking?.trip_id || 'Album Prep';

  }, [booking]);



  if (gate === 'loading') {

    return (

      <div className="min-h-screen flex items-center justify-center" style={{ background: NAVY, color: 'white' }}>

        <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />

      </div>

    );

  }



  if (gate === 'deny') {

    return (

      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: NAVY, color: 'white' }}>

        <div className="max-w-md w-full rounded-3xl border border-white/10 bg-white/5 p-8 text-center space-y-4">

          <p className="text-3xl" aria-hidden>

            🔒

          </p>

          <h1 className="font-serif text-2xl font-semibold">Link expired or invalid</h1>

          <p className="text-sm text-white/70">

            This album prep link may have expired or is not valid. Please contact Trip2Talk for a new link.

          </p>

          {expiresAt && (

            <p className="text-xs font-mono text-white/40">

              Expired: {new Date(expiresAt).toLocaleString('en-AU')}

            </p>

          )}

          <Link

            to="/"

            className="inline-flex items-center justify-center px-5 py-3 rounded-full text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10"

          >

            Back to home

          </Link>

        </div>

      </div>

    );

  }



  return (

    <div className="min-h-screen" style={{ background: NAVY, color: 'white' }}>

      <header className="sticky top-0 z-40 border-b border-white/10" style={{ background: 'rgba(13,27,42,0.92)' }}>

        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-3">

          <div className="min-w-0">

            <p className="text-[11px] font-semibold tracking-[0.28em]" style={{ color: GOLD }}>

              ALBUM PREP

            </p>

            <p className="text-sm font-semibold text-white/90 truncate">{title}</p>

          </div>

          <Link to="/" className="text-xs font-semibold px-3 py-2 rounded-full border border-white/15 bg-white/5 hover:bg-white/10">

            Home

          </Link>

        </div>

      </header>



      <main className="max-w-4xl mx-auto px-4 py-6 space-y-5">

        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">

          <p className="text-xs font-semibold tracking-wide" style={{ color: TEAL }}>

            Verified client — {booking?.client_name}

          </p>

          <p className="text-sm text-white/70 mt-2">

            Save this page to your phone. This guide is only visible with a valid portal link.

          </p>

          {expiresAt && (

            <p className="text-xs font-mono text-white/40 mt-3">

              Link valid until {new Date(expiresAt).toLocaleString('en-AU')}

            </p>

          )}

        </section>



        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">

            <h2 className="text-sm font-semibold" style={{ color: GOLD }}>

              Location

            </h2>

            <p className="text-sm text-white/70 mt-2">

              {booking?.trip_name || booking?.trip_id || 'Trip details'} — departure{' '}

              {booking?.departure_date || 'TBC'}.

            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 h-[200px] flex items-center justify-center text-white/40 text-sm">

              Maps preview

            </div>

          </div>



          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">

            <h2 className="text-sm font-semibold" style={{ color: GOLD }}>

              Shooting schedule

            </h2>

            <ul className="mt-3 text-sm text-white/75 space-y-2">

              <li>• Sunrise: soft light, portraits + silhouettes</li>

              <li>• Golden hour: editorial poses + wide shots</li>

              <li>• Night: tripod + long exposure (if applicable)</li>

            </ul>

            <p className="text-xs text-white/50 mt-3">Tip: use the “By Season” style guide for outfits.</p>

          </div>

        </section>



        <section className="rounded-3xl border border-white/10 bg-white/5 p-5">

          <h2 className="text-sm font-semibold" style={{ color: GOLD }}>

            What to wear

          </h2>

          <p className="text-sm text-white/70 mt-2">

            Use the “เตรียมตัวตามฤดู / By Season” guide from the homepage Gallery.

          </p>

        </section>

      </main>

    </div>

  );

}


