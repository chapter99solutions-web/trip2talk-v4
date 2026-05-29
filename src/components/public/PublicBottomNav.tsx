import { Link, useLocation } from 'react-router-dom';

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

export default function PublicBottomNav() {
  const { pathname } = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-white/92 backdrop-blur border-t border-slate-100"
      aria-label="Bottom navigation"
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {NAV.map((item) => {
          const isActive =
            item.to === '/'
              ? pathname === '/'
              : pathname.startsWith(item.to.replace(/\/$/, '')) && item.to !== '/';

          if (item.kind === 'primary') {
            return (
              <Link
                key={item.label}
                to={item.to}
                className="relative -mt-6 w-14 h-14 rounded-full bg-teal text-navy shadow-lg shadow-teal/20 flex items-center justify-center text-2xl border border-teal/30"
                aria-label={item.label}
              >
                {item.icon}
              </Link>
            );
          }

          return (
            <Link
              key={item.label}
              to={item.to}
              className="flex flex-col items-center justify-center gap-1 w-14"
              aria-label={item.label}
            >
              <span
                className={`text-lg leading-none ${
                  isActive ? 'text-navy' : 'text-slate-400'
                }`}
                aria-hidden
              >
                {item.icon}
              </span>
              <span className={`text-[10px] font-medium ${isActive ? 'text-navy' : 'text-slate-400'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

