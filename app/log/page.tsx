import type { Metadata } from 'next';
import { AuthGuard } from '@/components/layout/AuthGuard';
import { TopBar } from '@/components/layout/TopBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { PintForm } from '@/components/pint/PintForm';

export const metadata: Metadata = {
  title: 'Log a Pint — Guinness Passport',
};

export default function LogPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-black">
        <TopBar />
        <main className="max-w-xl mx-auto px-4 pt-20 pb-24">
          <div className="mt-4">
            <PintForm />
          </div>
        </main>
        <BottomNav />
      </div>
    </AuthGuard>
  );
}
