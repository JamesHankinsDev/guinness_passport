'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { HarpLogo } from '@/components/ui/HarpLogo';
import { Button } from '@/components/ui/Button';
import { signInWithEmail, signUpWithEmail, signInWithGoogle } from '@/lib/auth';

type Mode = 'gate' | 'signin' | 'signup';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('gate');
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleAgeGate = () => {
    if (!ageConfirmed) {
      toast.error('You must confirm you are of legal drinking age.');
      return;
    }
    setMode('signin');
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmail(email, password);
      router.replace('/diary');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign in failed';
      toast.error(msg.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { toast.error('Please enter your name.'); return; }
    setLoading(true);
    try {
      await signUpWithEmail(email, password, name);
      router.replace('/diary');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sign up failed';
      toast.error(msg.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim());
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (mode === 'gate') {
      toast.error('Please confirm your age first.');
      return;
    }
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.replace('/diary');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google sign in failed';
      toast.error(msg.replace('Firebase: ', '').replace(/\(auth\/[^)]+\)\.?/, '').trim());
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-radial from-gold/5 via-transparent to-transparent" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/3 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center mb-5">
            <HarpLogo className="w-12 h-14" />
          </div>
          <h1 className="font-display text-4xl text-cream mb-2">Guinness Passport</h1>
          <p className="text-cream/40 font-mono text-xs tracking-widest uppercase">
            Your Pint Diary
          </p>
        </div>

        {/* Gold border card */}
        <div className="border-gold-gradient rounded-2xl p-6 bg-[#0e0e0e]">
          <AnimatePresence mode="wait">
            {/* Age Gate */}
            {mode === 'gate' && (
              <motion.div
                key="gate"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="text-center">
                  <p className="font-display text-xl text-cream mb-1">Welcome, Drinker</p>
                  <p className="text-cream/50 text-sm font-body">
                    This app is intended for adults of legal drinking age.
                  </p>
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <div
                    className={`mt-0.5 w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                      ageConfirmed ? 'bg-gold border-gold' : 'border-white/30 group-hover:border-gold/50'
                    }`}
                    onClick={() => setAgeConfirmed(!ageConfirmed)}
                  >
                    {ageConfirmed && (
                      <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 12 12" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M1 6l3 3 7-7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-cream/70 text-sm font-body leading-relaxed">
                    I confirm that I am of legal drinking age in my country of residence and I agree to use this app responsibly.
                  </span>
                </label>

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleAgeGate}
                >
                  Enter
                </Button>
              </motion.div>
            )}

            {/* Sign In */}
            {mode === 'signin' && (
              <motion.div
                key="signin"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <p className="font-display text-xl text-cream">Sign in</p>

                <button
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 border border-white/10 rounded-lg py-2.5 text-cream/80 hover:bg-white/5 transition-colors text-sm font-mono tracking-wide disabled:opacity-50"
                >
                  {googleLoading ? (
                    <div className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  Continue with Google
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-cream/30 font-mono text-xs">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <form onSubmit={handleSignIn} className="space-y-3">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-cream placeholder-cream/30 font-mono text-sm focus:outline-none focus:border-gold/40 transition-colors"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-cream placeholder-cream/30 font-mono text-sm focus:outline-none focus:border-gold/40 transition-colors"
                  />
                  <Button type="submit" variant="primary" size="md" className="w-full" loading={loading}>
                    Sign in
                  </Button>
                </form>

                <p className="text-center text-cream/40 text-xs font-mono">
                  No account?{' '}
                  <button onClick={() => setMode('signup')} className="text-gold hover:underline">
                    Create one
                  </button>
                </p>
              </motion.div>
            )}

            {/* Sign Up */}
            {mode === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-5"
              >
                <p className="font-display text-xl text-cream">Create account</p>

                <button
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  className="w-full flex items-center justify-center gap-3 border border-white/10 rounded-lg py-2.5 text-cream/80 hover:bg-white/5 transition-colors text-sm font-mono tracking-wide disabled:opacity-50"
                >
                  {googleLoading ? (
                    <div className="w-4 h-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
                  ) : (
                    <GoogleIcon />
                  )}
                  Continue with Google
                </button>

                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-white/10" />
                  <span className="text-cream/30 font-mono text-xs">or</span>
                  <div className="flex-1 h-px bg-white/10" />
                </div>

                <form onSubmit={handleSignUp} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-cream placeholder-cream/30 font-mono text-sm focus:outline-none focus:border-gold/40 transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-cream placeholder-cream/30 font-mono text-sm focus:outline-none focus:border-gold/40 transition-colors"
                  />
                  <input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-cream placeholder-cream/30 font-mono text-sm focus:outline-none focus:border-gold/40 transition-colors"
                  />
                  <Button type="submit" variant="primary" size="md" className="w-full" loading={loading}>
                    Create account
                  </Button>
                </form>

                <p className="text-center text-cream/40 text-xs font-mono">
                  Already have one?{' '}
                  <button onClick={() => setMode('signin')} className="text-gold hover:underline">
                    Sign in
                  </button>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p className="text-center text-cream/20 font-mono text-[10px] mt-6 tracking-wider">
          DRINK RESPONSIBLY · 18+ ONLY
        </p>
      </motion.div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}
