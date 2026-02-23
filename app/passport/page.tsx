'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { getAllPints } from '@/lib/firestore';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PassportStamp } from '@/components/pint/PassportStamp';
import { HarpLogo } from '@/components/ui/HarpLogo';
import { Button } from '@/components/ui/Button';
import type { Pint } from '@/types';
import toast from 'react-hot-toast';

export default function PassportPage() {
  const { firebaseUser, userDoc } = useAuth();
  const [pints, setPints] = useState<Pint[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const passportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!firebaseUser) return;
    getAllPints(firebaseUser.uid)
      .then((data) => setPints(data.slice().reverse())) // oldest first for stamps
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  const handleExport = async () => {
    if (!passportRef.current) return;
    setExporting(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(passportRef.current, {
        background: '#0a0a0a',
        scale: 2,
        useCORS: true,
      } as Parameters<typeof html2canvas>[1]);
      const link = document.createElement('a');
      link.download = 'guinness-passport.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Passport exported!');
    } catch {
      toast.error('Export failed. Try a screenshot instead.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black">
        <TopBar />
        <main className="max-w-2xl mx-auto px-4 pt-20 pb-24">
          <div className="flex items-center justify-between mt-4 mb-8">
            <div>
              <h1 className="font-display text-2xl text-cream">Passport</h1>
              <p className="text-cream/40 font-mono text-xs tracking-wide mt-0.5">
                {pints.length} stamp{pints.length !== 1 ? 's' : ''} collected
              </p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              loading={exporting}
              onClick={handleExport}
            >
              <svg className="w-3.5 h-3.5 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </Button>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            </div>
          ) : (
            <div
              ref={passportRef}
              className="bg-[#0e0e0e] border border-gold/20 rounded-2xl p-6 relative overflow-hidden"
            >
              {/* Passport header */}
              <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gold/10">
                <HarpLogo className="w-10 h-12 flex-shrink-0" />
                <div>
                  <p className="font-mono text-gold/50 text-[10px] tracking-widest uppercase">
                    Guinness Passport
                  </p>
                  <p className="font-display text-cream text-xl mt-0.5">
                    {userDoc?.displayName ?? 'Drinker'}
                  </p>
                  <p className="font-mono text-cream/30 text-xs mt-0.5">
                    {userDoc?.email ?? ''}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="font-mono text-cream/20 text-[10px] tracking-widest uppercase">Total</p>
                  <p className="font-display text-gold text-3xl">{pints.length}</p>
                  <p className="font-mono text-cream/20 text-[10px]">pints</p>
                </div>
              </div>

              {/* Stamps grid */}
              {pints.length === 0 ? (
                <div className="text-center py-12 space-y-3">
                  <div className="w-20 h-20 rounded-full border-4 border-dashed border-white/10 mx-auto flex items-center justify-center">
                    <span className="text-2xl">🍺</span>
                  </div>
                  <p className="font-display text-cream/60">No stamps yet</p>
                  <p className="font-mono text-cream/30 text-xs">Log your first pint to earn your first stamp</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-6">
                  {pints.map((pint, i) => (
                    <PassportStamp key={pint.id} pint={pint} index={i} number={i + 1} />
                  ))}

                  {/* Empty stamp slots */}
                  {pints.length < 12 &&
                    [...Array(Math.ceil(pints.length / 4) * 4 - pints.length)].map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="w-28 h-28 mx-auto rounded-full border-4 border-dashed border-white/5 opacity-30"
                      />
                    ))}
                </div>
              )}

              {/* Decorative corner ornaments */}
              <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-gold/20 rounded-tr" />
              <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-gold/20 rounded-bl" />
              <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-gold/20 rounded-tl" />
              <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-gold/20 rounded-br" />
            </div>
          )}

          {pints.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-center"
            >
              <p className="font-mono text-cream/20 text-xs tracking-widest uppercase">
                — Keep collecting —
              </p>
            </motion.div>
          )}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
