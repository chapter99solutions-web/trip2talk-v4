export type CrewMember = {
  name: string;
  role: string;
  imageSrc: string;
  fallbackSrc: string;
  imageAlt: string;
  intro: string;
};

const SAEN_PHOTO =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Meet%20the%20Crew/saen%20man.jpg';

const MONSICHA_PHOTO =
  'https://niuibpznjvytprbrzvnn.supabase.co/storage/v1/object/public/portfolio/Meet%20the%20Crew/Ploy.jpg';

const FALLBACK_SAEN =
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&q=85&auto=format&fit=crop';
const FALLBACK_PLOY =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=800&q=85&auto=format&fit=crop';

const CREW: CrewMember[] = [
  {
    name: 'SAEN',
    role: 'Trip Leader & Photographer',
    imageSrc: SAEN_PHOTO,
    fallbackSrc: FALLBACK_SAEN,
    imageAlt: "P'Saen — Trip Leader & Photographer",
    intro:
      'Founder of Chapter 99 Photography and the creative lead behind every Trip2Talk journey. Saen plans light, pacing, and composition so your group walks away with a finished .JPG gallery that feels intentional — never rushed, never generic.',
  },
  {
    name: 'MONSICHA CHAYAKORN',
    role: 'Admin & Trip Staff',
    imageSrc: MONSICHA_PHOTO,
    fallbackSrc: FALLBACK_PLOY,
    imageAlt: 'K.Ploy — Admin & Trip Staff',
    intro:
      'The calm centre of operations — from booking confirmations to on-trip logistics and Messenger group care. Ploy makes sure every guest feels prepared, informed, and looked after before the shutter ever clicks.',
  },
];

function CrewCard({ member }: { member: CrewMember }) {
  return (
    <article className="group">
      <div className="overflow-hidden bg-slate-100">
        <div className="aspect-square overflow-hidden">
          <img
            src={member.imageSrc}
            alt={member.imageAlt}
            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
            onError={(e) => {
              const img = e.currentTarget;
              if (img.src !== member.fallbackSrc) {
                img.src = member.fallbackSrc;
              }
            }}
          />
        </div>
      </div>

      <header className="mt-6 space-y-2">
        <h3 className="text-sm font-bold tracking-[0.2em] text-slate-900 uppercase">{member.name}</h3>
        <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{member.role}</p>
      </header>

      <p className="mt-5 text-[15px] leading-[1.75] text-slate-600 font-sans">{member.intro}</p>
    </article>
  );
}

type MeetTheCrewProps = {
  showHeading?: boolean;
  className?: string;
};

export default function MeetTheCrew({ showHeading = true, className = '' }: MeetTheCrewProps) {
  return (
    <section id="crew" className={className} aria-labelledby={showHeading ? 'crew-heading' : undefined}>
      {showHeading && (
        <div className="text-center max-w-2xl mx-auto mb-14 md:mb-16">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-slate-400 uppercase mb-4">Chapter 99</p>
          <h2
            id="crew-heading"
            className="font-serif text-3xl md:text-4xl font-semibold text-slate-900 tracking-tight"
          >
            Meet the Crew
          </h2>
          <p className="mt-4 text-sm md:text-base text-slate-500 leading-relaxed">
            The people behind your Private Photo Journey — small by design, personal by nature.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
        {CREW.map((member) => (
          <CrewCard key={member.name} member={member} />
        ))}
      </div>
    </section>
  );
}
