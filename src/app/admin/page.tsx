'use client';

import { Suspense } from 'react';
import AdminPageContent from '@/components/AdminPageContent';

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading admin panel...</div>
      </div>
    }>
      <AdminPageContent />
    </Suspense>
  );
}