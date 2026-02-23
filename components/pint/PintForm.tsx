'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { useGeolocation } from '@/hooks/useGeolocation';
import { addPint, getFriends } from '@/lib/firestore';
import { uploadPintPhoto } from '@/lib/storage';
import { searchNearbyPubs, searchPubsByText, PlaceResult } from '@/lib/places';
import { ALL_TAGS, PintFormData } from '@/types';
import type { User } from '@/types';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { TagPill } from '@/components/ui/TagPill';

const STEPS = ['Location', 'Rating', 'Tags', 'Friends', 'Note', 'Photo'] as const;
type Step = typeof STEPS[number];

// Prevent Enter key from bubbling up and triggering any button outside the input
function suppressEnter(e: React.KeyboardEvent) {
  if (e.key === 'Enter') e.preventDefault();
}

export function PintForm() {
  const { firebaseUser, refreshUserDoc } = useAuth();
  const router = useRouter();
  const { lat, lng, loading: geoLoading, locate } = useGeolocation();

  const [step, setStep] = useState<Step>('Location');
  const [pubs, setPubs] = useState<PlaceResult[]>([]);
  const [pubSearch, setPubSearch] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stampVisible, setStampVisible] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAddress, setManualAddress] = useState('');
  const [friends, setFriends] = useState<User[]>([]);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    getFriends(firebaseUser.uid).then(setFriends).catch(() => {});
  }, [firebaseUser?.uid]);

  const [form, setForm] = useState<PintFormData>({
    pubName: '',
    address: '',
    placeId: '',
    lat: 0,
    lng: 0,
    rating: 3,
    tags: [],
    note: '',
    withFriends: [],
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const stepIndex = STEPS.indexOf(step);

  const handleNearbySearch = async () => {
    if (!lat || !lng) return;
    setSearchLoading(true);
    try {
      const results = await searchNearbyPubs(lat, lng);
      setPubs(results);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleTextSearch = async () => {
    if (!pubSearch.trim()) return;
    setSearchLoading(true);
    try {
      const results = await searchPubsByText(pubSearch);
      setPubs(results);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectPub = (pub: PlaceResult) => {
    setForm((f) => ({
      ...f,
      pubName: pub.name,
      address: pub.address,
      placeId: pub.placeId,
      lat: pub.lat,
      lng: pub.lng,
    }));
    setPubs([]);
  };

  const confirmManual = () => {
    if (!manualName.trim()) return;
    setForm((f) => ({
      ...f,
      pubName: manualName.trim(),
      address: manualAddress.trim(),
      placeId: `manual_${Date.now()}`,
      lat: lat ?? 0,
      lng: lng ?? 0,
    }));
    setManualOpen(false);
  };

  const clearPub = () => {
    setForm((f) => ({ ...f, pubName: '', address: '', placeId: '' }));
    setManualName('');
    setManualAddress('');
  };

  const toggleTag = (tag: string) => {
    setForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const canProceed = () => {
    if (step === 'Location') return !!form.pubName;
    return true;
  };

  const handleSave = async () => {
    if (!firebaseUser) return;
    setSaving(true);
    try {
      let photoUrl: string | undefined;
      if (photo) {
        photoUrl = await uploadPintPhoto(firebaseUser.uid, photo);
      }
      await addPint(firebaseUser.uid, form, photoUrl);
      await refreshUserDoc();

      setStampVisible(true);
      toast.success('Pint logged! 🍺');

      // Celebrate any newly awarded badges (refreshUserDoc gives updated badges)
      // Badge toasts are fired in addPint → checkAndAwardPintBadges internally,
      // but we surface them here via a brief delay
      setTimeout(() => {
        router.replace('/diary');
      }, 1800);
    } catch (err) {
      console.error(err);
      toast.error('Failed to save pint.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative">
      {/* Stamp overlay */}
      <AnimatePresence>
        {stampVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 2, rotate: -20, opacity: 0 }}
              animate={{ scale: 1, rotate: -5, opacity: 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 150 }}
            >
              <div className="w-44 h-44 rounded-full border-8 border-gold flex items-center justify-center bg-black">
                <div className="text-center">
                  <div className="font-mono text-gold text-xs tracking-widest uppercase mb-1">Logged</div>
                  <div className="font-display text-gold text-xl font-bold">
                    {form.pubName.split(' ').slice(0, 2).join(' ')}
                  </div>
                  <div className="font-mono text-gold/60 text-xs mt-1 tracking-wider">
                    {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex-1 h-0.5 ${i === 0 ? 'hidden' : ''} ${i <= stepIndex ? 'bg-gold/60' : 'bg-white/10'}`} />
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-mono transition-colors ${
              i < stepIndex ? 'bg-gold text-black' :
              i === stepIndex ? 'border-2 border-gold text-gold' :
              'border border-white/20 text-cream/30'
            }`}>
              {i < stepIndex ? '✓' : i + 1}
            </div>
            {i === stepIndex && (
              <span className="text-gold font-mono text-xs tracking-wide">{s}</span>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Location */}
        {step === 'Location' && (
          <motion.div key="location" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="font-display text-xl text-cream mb-1">Where are you?</h2>
              <p className="text-cream/40 font-mono text-xs">Find the pub you&apos;re drinking in</p>
            </div>

            {form.pubName ? (
              /* Selected pub confirmation card */
              <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="font-display text-cream">{form.pubName}</p>
                  <p className="text-cream/50 font-mono text-xs mt-0.5">{form.address || 'No address'}</p>
                </div>
                <button
                  type="button"
                  onClick={clearPub}
                  className="text-cream/40 hover:text-cream transition-colors p-1"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                {/* GPS / nearby search */}
                <Button
                  variant="secondary"
                  size="md"
                  className="w-full"
                  loading={geoLoading}
                  onClick={locate}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {lat && lng ? 'Location detected' : 'Detect my location'}
                </Button>

                {lat && lng && (
                  <Button variant="primary" size="md" className="w-full" loading={searchLoading} onClick={handleNearbySearch}>
                    Find nearby pubs
                  </Button>
                )}

                {/* Text search */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search pub name…"
                    value={pubSearch}
                    onChange={(e) => setPubSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); handleTextSearch(); }
                    }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-cream placeholder-cream/30 font-mono text-sm focus:outline-none focus:border-gold/40 transition-colors"
                  />
                  <Button variant="secondary" size="md" loading={searchLoading} onClick={handleTextSearch}>
                    Search
                  </Button>
                </div>

                {/* Pub results */}
                {pubs.length > 0 && (
                  <div className="space-y-1.5 max-h-60 overflow-y-auto">
                    {pubs.map((pub) => (
                      <button
                        key={pub.placeId}
                        type="button"
                        onClick={() => selectPub(pub)}
                        className="w-full text-left bg-white/5 hover:bg-white/8 border border-white/10 hover:border-gold/30 rounded-lg px-4 py-3 transition-colors"
                      >
                        <p className="font-display text-cream text-sm">{pub.name}</p>
                        <p className="font-mono text-cream/40 text-xs mt-0.5">{pub.address}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Manual entry — controlled open/close, no <details> */}
                <div>
                  <button
                    type="button"
                    onClick={() => setManualOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-cream/40 font-mono text-xs hover:text-cream/60 transition-colors"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${manualOpen ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    Enter manually
                  </button>

                  <AnimatePresence>
                    {manualOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 space-y-2">
                          <input
                            type="text"
                            placeholder="Pub name *"
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.form?.elements.namedItem('manualAddress') as HTMLElement | null; (document.getElementById('manualAddress') as HTMLInputElement | null)?.focus(); }
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-cream placeholder-cream/30 font-mono text-sm focus:outline-none focus:border-gold/40 transition-colors"
                          />
                          <input
                            id="manualAddress"
                            type="text"
                            placeholder="Address (optional)"
                            value={manualAddress}
                            onChange={(e) => setManualAddress(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { e.preventDefault(); confirmManual(); }
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-cream placeholder-cream/30 font-mono text-sm focus:outline-none focus:border-gold/40 transition-colors"
                          />
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full"
                            disabled={!manualName.trim()}
                            onClick={confirmManual}
                          >
                            Use this pub
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </motion.div>
        )}

        {/* Step 2: Rating */}
        {step === 'Rating' && (
          <motion.div key="rating" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div>
              <h2 className="font-display text-xl text-cream mb-1">How was it?</h2>
              <p className="text-cream/40 font-mono text-xs">Rate your pint at {form.pubName}</p>
            </div>
            <div className="flex flex-col items-center gap-4 py-6">
              <StarRating value={form.rating} onChange={(r) => setForm((f) => ({ ...f, rating: r }))} size="lg" />
              <p className="font-display text-2xl text-gold">{RATING_LABELS[form.rating]}</p>
            </div>
          </motion.div>
        )}

        {/* Step 3: Tags */}
        {step === 'Tags' && (
          <motion.div key="tags" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="font-display text-xl text-cream mb-1">Describe the pour</h2>
              <p className="text-cream/40 font-mono text-xs">Select all that apply</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {ALL_TAGS.map((tag) => (
                <TagPill
                  key={tag}
                  label={tag}
                  selected={form.tags.includes(tag)}
                  onClick={() => toggleTag(tag)}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 4: Friends */}
        {step === 'Friends' && (
          <motion.div key="friends" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="font-display text-xl text-cream mb-1">Who&apos;s with you?</h2>
              <p className="text-cream/40 font-mono text-xs">Tag friends who are having this pint with you</p>
            </div>

            {friends.length === 0 ? (
              <div className="text-center py-8 space-y-3">
                <p className="text-3xl">🤝</p>
                <p className="font-mono text-cream/40 text-xs">No friends connected yet</p>
                <p className="font-mono text-cream/20 text-xs">
                  Share your QR code from the Profile page to connect with friends
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {friends.map((f) => {
                  const selected = (form.withFriends ?? []).includes(f.uid);
                  return (
                    <button
                      key={f.uid}
                      type="button"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          withFriends: selected
                            ? (prev.withFriends ?? []).filter((id) => id !== f.uid)
                            : [...(prev.withFriends ?? []), f.uid],
                        }))
                      }
                      className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 border transition-colors ${
                        selected
                          ? 'bg-gold/10 border-gold/40'
                          : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${selected ? 'bg-gold/20 border-gold/40' : 'bg-white/10 border-white/10'}`}>
                        {f.photoURL ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={f.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span className="font-display text-sm" style={{ color: selected ? '#c9a84c' : '#f5f0e8' }}>
                            {(f.displayName ?? 'G')[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <span className={`font-display text-sm ${selected ? 'text-gold' : 'text-cream'}`}>
                        {f.displayName}
                      </span>
                      {selected && (
                        <svg className="w-4 h-4 text-gold ml-auto" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {(form.withFriends ?? []).length > 0 && (
              <p className="font-mono text-gold/70 text-xs text-center">
                {form.withFriends!.length} friend{form.withFriends!.length !== 1 ? 's' : ''} tagged — you may earn a badge!
              </p>
            )}
          </motion.div>
        )}

        {/* Step 5: Note */}
        {step === 'Note' && (
          <motion.div key="note" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="font-display text-xl text-cream mb-1">Tasting notes</h2>
              <p className="text-cream/40 font-mono text-xs">Optional — what made this pint memorable?</p>
            </div>
            <textarea
              rows={4}
              placeholder="Silky smooth with a perfect two-finger head…"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-cream placeholder-cream/30 font-body text-sm focus:outline-none focus:border-gold/40 transition-colors resize-none"
            />
            <p className="text-cream/20 font-mono text-xs text-right">{form.note.length}/500</p>
          </motion.div>
        )}

        {/* Step 5: Photo */}
        {step === 'Photo' && (
          <motion.div key="photo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
            <div>
              <h2 className="font-display text-xl text-cream mb-1">Add a photo</h2>
              <p className="text-cream/40 font-mono text-xs">Optional — capture the perfect pint</p>
            </div>

            {photoPreview ? (
              <div className="relative rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoPreview} alt="Pint" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => { setPhoto(null); setPhotoPreview(null); }}
                  className="absolute top-2 right-2 w-7 h-7 bg-black/70 rounded-full flex items-center justify-center text-cream hover:bg-black/90 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full h-40 border-2 border-dashed border-white/15 hover:border-gold/30 rounded-xl flex flex-col items-center justify-center gap-3 text-cream/40 hover:text-cream/60 transition-colors"
              >
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                </svg>
                <span className="font-mono text-xs">Tap to add photo</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoChange} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav buttons */}
      <div className="flex gap-3 mt-8">
        {stepIndex > 0 && (
          <Button variant="ghost" size="md" className="flex-1" onClick={() => setStep(STEPS[stepIndex - 1])}>
            ← Back
          </Button>
        )}
        {stepIndex < STEPS.length - 1 ? (
          <Button
            variant="primary"
            size="md"
            className="flex-1"
            disabled={!canProceed()}
            onClick={() => setStep(STEPS[stepIndex + 1])}
          >
            Next →
          </Button>
        ) : (
          <Button variant="primary" size="md" className="flex-1" loading={saving} onClick={handleSave}>
            Log this pint
          </Button>
        )}
      </div>
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Great',
  5: 'Perfect',
};
