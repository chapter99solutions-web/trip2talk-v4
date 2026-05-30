import { Link, useLocation, useNavigate } from 'react-router-dom';

type NavItem = {
  to: string;
  label: string;
  icon: string;
  kind?: 'default' | 'primary';
};

const NAV: NavItem[] = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/tours/nz-aut-2026', label: 'Calendar', icon: '📅' },
  { to: '/tours/nz-aut-2026', label: 'Camera', icon: '📷', kind: 'primary' },
  { to: '/tours/nz-aut-2026', label: 'Saved', icon: '♡' },
  { to: '/portal', label: 'Portal', icon: '👤' },
];

// Spring-like easing used for all press interactions.
const SPRING = 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)';

export default function PublicBottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Center camera button opens the Gallery. There is no standalone /gallery
  // route (the router catch-all redirects unknown paths to "/"), so the
  // canonical gallery is the PortfolioGallery section (id="portfolio") on the
  // homepage. Navigate home if needed, then smooth-scroll to it.
  const goToGallery = () => {
    const scrollToGallery = () =>
      document
        .getElementById('portfolio')
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (pathname === '/') {
      scrollToGallery();
    } else {
      navigate('/');
      window.setTimeout(scrollToGallery, 120);
    }
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/80"
      aria-label="Bottom navigation"
      style={{
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow:
          'inset 0 1px 0 rgba(255,255,255,0.1), 0 -4px 30px rgba(0,0,0,0.6)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {NAV.map((item) => {
          const isActive =
            item.to === '/'
              ? pathname === '/'
              : pathname.startsWith(item.to.replace(/\/$/, '')) && item.to !== '/';

          if (item.kind === 'primary') {
            return (
              <button
                key={item.label}
                type="button"
                onClick={goToGallery}
                className="relative w-14 h-14 rounded-full flex items-center justify-center text-2xl active:scale-[0.92]"
                aria-label="Gallery"
                style={{
                  background:
                    'radial-gradient(circle at 30% 30%, #4ade80, #16a34a)',
                  boxShadow:
                    '0 4px 15px rgba(74,222,128,0.5), 0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
                  transform: 'translateY(-8px)',
                  transition: SPRING,
                }}
              >
                {item.icon}
              </button>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.to}
              className="flex flex-col items-center justify-center gap-1 w-14 active:scale-[0.92]"
              aria-label={item.label}
              style={{ transition: SPRING }}
            >
              <span
                className="leading-none"
                aria-hidden
                style={{
                  fontSize: '24px',
                  opacity: isActive ? 1 : 0.35,
                  filter: isActive
                    ? 'drop-shadow(0 0 6px rgba(74,222,128,0.7))'
                    : 'none',
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : 'rgba(255,255,255,0.35)',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
