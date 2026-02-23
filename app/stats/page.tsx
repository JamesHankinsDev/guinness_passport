'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { computeStats } from '@/lib/firestore';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { StarRating } from '@/components/ui/StarRating';
import { Skeleton } from '@/components/ui/Skeleton';
import type { Stats } from '@/types';

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#111] border border-white/5 rounded-xl p-4"
    >
      <p className="font-mono text-[10px] text-cream/40 tracking-widest uppercase mb-1">{label}</p>
      <p className="font-display text-3xl text-gold">{value}</p>
      {sub && <p className="font-mono text-cream/30 text-xs mt-1">{sub}</p>}
    </motion.div>
  );
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a1a] border border-gold/20 rounded-lg px-3 py-2">
        <p className="font-mono text-gold text-xs">{label}</p>
        <p className="font-display text-cream text-sm">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function StatsPage() {
  const { firebaseUser } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    computeStats(firebaseUser.uid)
      .then(setStats)
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  const dayData = stats
    ? DAYS.map((day) => ({
        day,
        count: stats.dayOfWeekDistribution[day] ?? 0,
      }))
    : [];

  const ratingData = stats
    ? [1, 2, 3, 4, 5].map((r) => ({
        rating: `${r}★`,
        count: stats.ratingDistribution[r] ?? 0,
      }))
    : [];

  return (
    <AuthGuard>
      <div className="min-h-screen bg-black">
        <TopBar />
        <main className="max-w-2xl mx-auto px-4 pt-20 pb-24">
          <div className="mt-4 mb-6">
            <h1 className="font-display text-2xl text-cream">Stats</h1>
            <p className="text-cream/40 font-mono text-xs tracking-wide mt-0.5">Your drinking at a glance</p>
          </div>

          {loading ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
              </div>
            </div>
          ) : !stats || stats.totalPints === 0 ? (
            <div className="text-center py-16">
              <p className="font-display text-cream text-lg">No data yet</p>
              <p className="font-mono text-cream/40 text-xs mt-2">Log some pints to see your stats</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Key stats grid */}
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Total pints" value={stats.totalPints} />
                <StatCard label="Unique pubs" value={stats.uniquePubs} />
                <StatCard label="Avg rating" value={stats.avgRating ? stats.avgRating.toFixed(1) : '—'} />
                {stats.bestPub ? (
                  <StatCard
                    label="Best pub"
                    value={stats.bestPubRating.toFixed(1) + '★'}
                    sub={stats.bestPub}
                  />
                ) : (
                  <StatCard label="Best pub" value="—" sub="Need ≥2 visits" />
                )}
              </div>

              {/* Best pub highlight */}
              {stats.bestPub && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-gradient-to-r from-gold/10 to-transparent border border-gold/20 rounded-xl p-4"
                >
                  <p className="font-mono text-gold/60 text-[10px] tracking-widest uppercase mb-1">Top Pub</p>
                  <div className="flex items-center justify-between">
                    <p className="font-display text-cream text-lg">{stats.bestPub}</p>
                    <StarRating value={Math.round(stats.bestPubRating)} readonly size="sm" />
                  </div>
                  <p className="font-mono text-cream/40 text-xs mt-1">Average: {stats.bestPubRating.toFixed(1)} / 5</p>
                </motion.div>
              )}

              {/* Day of week chart */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-[#111] border border-white/5 rounded-xl p-4"
              >
                <h2 className="font-display text-cream text-base mb-4">Pints by Day</h2>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={dayData} barSize={24}>
                    <XAxis
                      dataKey="day"
                      tick={{ fill: 'rgba(245,240,232,0.4)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {dayData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.count === Math.max(...dayData.map(d => d.count)) ? '#c9a84c' : 'rgba(201,168,76,0.3)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Rating distribution */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-[#111] border border-white/5 rounded-xl p-4"
              >
                <h2 className="font-display text-cream text-base mb-4">Rating Distribution</h2>
                <ResponsiveContainer width="100%" height={140}>
                  <BarChart data={ratingData} barSize={32}>
                    <XAxis
                      dataKey="rating"
                      tick={{ fill: 'rgba(245,240,232,0.4)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(201,168,76,0.05)' }} />
                    <Bar dataKey="count" fill="rgba(201,168,76,0.5)" radius={[4, 4, 0, 0]}>
                      {ratingData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.rating === '5★' ? '#c9a84c' : `rgba(201,168,76,${0.2 + index * 0.15})`}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              {/* Encouraging message */}
              <div className="text-center py-2">
                <p className="font-mono text-cream/20 text-xs tracking-widest uppercase">
                  {stats.totalPints < 10
                    ? `${10 - stats.totalPints} more pints until you're a seasoned drinker`
                    : stats.totalPints < 50
                    ? `${50 - stats.totalPints} pints to the half-century`
                    : stats.totalPints < 100
                    ? `${100 - stats.totalPints} pints to the century`
                    : 'A true Guinness connoisseur'}
                </p>
              </div>
            </div>
          )}
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
