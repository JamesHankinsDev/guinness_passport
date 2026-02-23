'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

interface QRCodeModalProps {
  uid: string;
  open: boolean;
  onClose: () => void;
}

export function QRCodeModal({ uid, open, onClose }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : 'https://guinness-passport.vercel.app';
  const link = `${origin}/add-friend/${uid}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Add Me as a Friend">
      <div className="flex flex-col items-center gap-5">
        <p className="font-mono text-cream/50 text-xs text-center">
          Ask a friend to scan this QR code or share the link below
        </p>

        {/* QR Code */}
        <div className="bg-white p-4 rounded-2xl">
          <QRCode value={link} size={200} fgColor="#0a0a0a" bgColor="#ffffff" />
        </div>

        {/* Copyable link */}
        <div className="w-full space-y-2">
          <div className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 break-all">
            <p className="font-mono text-cream/40 text-[10px]">{link}</p>
          </div>
          <Button variant="secondary" size="md" className="w-full" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy Link'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
