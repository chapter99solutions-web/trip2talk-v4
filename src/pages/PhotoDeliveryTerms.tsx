import { Link } from 'react-router-dom';

export default function PhotoDeliveryTerms() {
  return (
    <article className="max-w-2xl mx-auto px-4 py-10 prose prose-invert prose-sm">
      <h1 className="font-serif text-2xl text-[color:var(--gold)] not-prose">Photo delivery terms</h1>
      <p className="text-neutral-400 text-sm not-prose">Task 12 · Trip2Talk V4</p>

      <section className="cyber-card p-5 space-y-3 text-sm text-neutral-300 not-prose mt-6">
        <h2 className="font-semibold text-[color:var(--teal)]">Deliverables</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Final edited images delivered as <strong>.JPG</strong> only.</li>
          <li>No RAW, DNG, CR2, ARW, or other camera-native files are provided.</li>
          <li>Colour grading and retouching are included per the agreed package.</li>
        </ul>

        <h2 className="font-semibold text-[color:var(--teal)] pt-2">Album link</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>Private online album links expire <strong>60 days</strong> after the trip end date.</li>
          <li>Download your gallery before expiry; extensions may be available on request.</li>
        </ul>

        <h2 className="font-semibold text-[color:var(--teal)] pt-2">Usage</h2>
        <p>
          Personal and social use is permitted unless a commercial licence is purchased separately.
          Chapter 99 Photography retains copyright; you receive a usage licence for delivered files.
        </p>
      </section>

      <p className="text-xs text-neutral-500 mt-6 not-prose">
        <Link to="/" className="text-[color:var(--teal)]">← Home</Link>
        {' · '}
        <Link to="/package-terms" className="text-[color:var(--teal)]">
          Package terms
        </Link>
      </p>
    </article>
  );
}
