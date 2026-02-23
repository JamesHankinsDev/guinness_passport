'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { HarpLogo } from '@/components/ui/HarpLogo';
import { useAuth } from '@/context/AuthContext';

const NAV_ITEMS = [
  { label: 'Diary', href: '/diary' },
  { label: 'Map', href: '/map' },
  { label: 'Passport', href: '/passport' },
  { label: 'Stats', href: '/stats' },
];

export function TopBar() {
  const pathname = usePathname();
  const { firebaseUser, userDoc } = useAuth();
  const photoURL = firebaseUser?.photoURL ?? userDoc?.photoURL ?? null;

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-black/90 backdrop-blur-md border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/diary" className="flex items-center gap-2.5">
          <HarpLogo className="w-6 h-7" />
          <span className="font-display text-gold text-lg leading-none hidden sm:block">
            Guinness Passport
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV_ITEMS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm font-mono tracking-wide transition-colors ${
                pathname === href
                  ? 'text-gold bg-gold/10'
                  : 'text-cream/50 hover:text-cream/80'
              }`}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/profile"
            className={`ml-2 w-8 h-8 rounded-full border overflow-hidden flex items-center justify-center text-xs font-mono transition-colors ${
              pathname === '/profile'
                ? 'border-gold bg-gold/10'
                : 'border-white/20 hover:border-gold/40'
            }`}
          >
            {photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
            ) : (
              <span className={pathname === '/profile' ? 'text-gold' : 'text-cream/60'}>
                {userDoc?.displayName?.[0]?.toUpperCase() ?? firebaseUser?.email?.[0]?.toUpperCase() ?? '?'}
              </span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
