'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { updatePint, PintEditFields } from '@/lib/firestore';
import { searchPubsByText, PlaceResult } from '@/lib/places';
import { ALL_TAGS } from '@/types';
import type { Pint } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { StarRating } from '@/components/ui/StarRating';
import { TagPill } from '@/components/ui/TagPill';

interface EditPintModalProps {
  pint: Pint;
  uid: string;
  open: boolean;
  onClose: () => void;
  onSaved: (updated: Pint) => void;
}

export function EditPintModal({ pint, uid, open, onClose, onSaved }: EditPintModalProps) {
  const [pubName, setPubName] = useState(pint.pubName);
  const [address, setAddress] = useState(pint.address);
  const [placeId, setPlaceId] = useState(pint.placeId);
  const [lat, setLat] = useState(pint.lat);
  const [lng, setLng] = useState(pint.lng);
  const [rating, setRating] = useState(pint.rating);
  const [tags, setTags] = useState<string[]>(pint.tags);
  const [note, setNote] = useState(pint.note);

  const [pubSearch, setPubSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);

  const handlePubSearch = async () => {
    if (!pubSearch.trim()) return;
    setSearching(true);
    try {
      const results = await searchPubsByText(pubSearch);
      setSearchResults(results);
    } finally {
      setSearching(false);
    }
  };

  const selectPub = (pub: PlaceResult) => {
    setPubName(pub.name);
    setAddress(pub.address);
    setPlaceId(pub.placeId);
    setLat(pub.lat);
    setLng(pub.lng);
    setSearchResults([]);
    setPubSearch('');
  };

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSave = async () => {
    if (!pubName.trim()) {
      toast.error('Pub name is required');
      return;
    }
    setSaving(true);
    try {
      const fields: PintEditFields = { pubName, address, placeId, lat, lng, rating, tags, note };
      await updatePint(pint.id, uid, fields);
      onSaved({ ...pint, ...fields });
      toast.success('Pint updated');
      onClose();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update pint');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Pint">
      <div className="space-y-5">

        {/* Location */}
        <div className="space-y-2">
          <label className="font-mono text-cream/50 text-xs tracking-wide block">Pub</label>

          {/* Current pub pill */}
          <div className="bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-cream text-sm truncate">{pubName}</p>
              {address && <p className="font-mono text-cream/40 text-xs mt-0.5 truncate">{address}</p>}
            </div>
          </div>

          {/* Search to replace */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search for correct pub…"
              value={pubSearch}
              onChange={(e) => setPubSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handlePubSearch(); } }}
              className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream placeholder-cream/20 font-mono text-xs focus:outline-none focus:border-gold/40 transition-colors"
            />
            <Button variant="secondary" size="sm" loading={searching} onClick={handlePubSearch}>
              Search
            </Button>
          </div>

          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="space-y-1 max-h-44 overflow-y-auto"
              >
                {searchResults.map((pub) => (
                  <button
                    key={pub.placeId}
                    type="button"
                    onClick={() => selectPub(pub)}
                    className="w-full text-left bg-white/5 hover:bg-gold/10 border border-white/10 hover:border-gold/30 rounded-lg px-3 py-2.5 transition-colors"
                  >
                    <p className="font-display text-cream text-sm">{pub.name}</p>
                    <p className="font-mono text-cream/40 text-xs mt-0.5">{pub.address}</p>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Manual address override */}
          <input
            type="text"
            placeholder="Or type address manually…"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-cream placeholder-cream/20 font-mono text-xs focus:outline-none focus:border-gold/40 transition-colors"
          />
        </div>

        {/* Rating */}
        <div className="space-y-2">
          <label className="font-mono text-cream/50 text-xs tracking-wide block">Rating</label>
          <StarRating value={rating} onChange={setRating} size="md" />
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label className="font-mono text-cream/50 text-xs tracking-wide block">Tags</label>
          <div className="flex flex-wrap gap-2">
            {ALL_TAGS.map((tag) => (
              <TagPill key={tag} label={tag} selected={tags.includes(tag)} onClick={() => toggleTag(tag)} size="sm" />
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="space-y-2">
          <label className="font-mono text-cream/50 text-xs tracking-wide block">Tasting note</label>
          <textarea
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Any notes…"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-cream placeholder-cream/20 font-body text-sm focus:outline-none focus:border-gold/40 transition-colors resize-none"
          />
        </div>

        <Button variant="primary" size="md" className="w-full" loading={saving} onClick={handleSave}>
          Save changes
        </Button>
      </div>
    </Modal>
  );
}
