'use client';

import { motion } from 'framer-motion';
import type { User } from '@/types';

interface SplitLeaderboardProps {
  currentUser: User;
  friends: User[];
}

export function SplitLeaderboard({ currentUser, friends }: SplitLeaderboardProps) {
  const allUsers = [currentUser, ...friends];

  const ranked = allUsers
    .filter((u) => (u.totalSplits ?? 0) >= 3)
    .sort((a, b) => (b.avgSplitScore ?? 0) - (a.avgSplitScore ?? 0));

  if (ranked.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="font-mono text-cream/30 text-xs">
          Need 3+ split attempts to qualify. Keep splitting!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {ranked.map((user, i) => {
        const isMe = user.uid === currentUser.uid;
        return (
          <motion.div
            key={user.uid}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
              isMe ? 'bg-gold/10 border-gold/30' : 'bg-[#111] border-white/5'
            }`}
          >
            <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono text-xs ${
              i === 0 ? 'bg-gold text-black' :
              i === 1 ? 'bg-gold/40 text-cream' :
              i === 2 ? 'bg-gold/20 text-cream' :
              'bg-white/10 text-cream/50'
            }`}>
              {i + 1}
            </div>

            <div className="w-8 h-8 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0 overflow-hidden">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="" referrerPolicy="no-referrer" className="w-full h-full rounded-full object-cover" />
              ) : (
                <span className="font-display text-gold text-sm">
                  {(user.displayName ?? 'G')[0].toUpperCase()}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={`font-display text-sm truncate ${isMe ? 'text-gold' : 'text-cream'}`}>
                {user.displayName}{isMe ? ' (you)' : ''}
              </p>
              <p className="font-mono text-cream/40 text-[10px]">
                {user.totalSplits} attempts · Best: {user.bestSplitScore ?? '—'}
              </p>
            </div>

            <div className="text-right shrink-0">
              <p className="font-display text-xl text-gold">{(user.avgSplitScore ?? 0).toFixed(1)}</p>
              <p className="font-mono text-cream/30 text-[10px]">AVG</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
