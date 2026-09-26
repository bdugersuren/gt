'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    try {
      const user = raw ? JSON.parse(raw) : null;
      if (!token || !user?.roles?.includes('STUDENT')) {
        router.replace('/login');
        return;
      }
      setReady(true);
    } catch {
      router.replace('/login');
    }
  }, [router]);

  if (!ready) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-500">Сурагчийн хэсгийг ачаалж байна...</div>;
  return <>{children}</>;
}
