'use client';

import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

export function DemoBanner() {
  const { isDemo, exitDemo } = useAuth();

  if (!isDemo) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
      <div className="flex items-center gap-3 bg-[#111] border border-gold/30 rounded-full px-4 py-2 shadow-lg shadow-black/50 pointer-events-auto">
        <span className="font-mono text-xs text-cream/50 tracking-wide">Demo mode</span>
        <div className="w-px h-3 bg-white/10" />
        <Link
          href="/login"
          onClick={exitDemo}
          className="font-mono text-xs text-gold hover:text-gold/80 transition-colors tracking-wide"
        >
          Sign up to save your pints
        </Link>
      </div>
    </div>
  );
}
