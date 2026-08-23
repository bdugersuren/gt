'use client';

import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: { href: string; label: string } }) {
  return <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div><h2 className="text-xl font-black text-slate-900 dark:text-white">{title}</h2>{description && <p className="mt-1 text-xs text-slate-500">{description}</p>}</div>
    {action && <Link href={action.href} className="rounded-xl bg-teal-500 px-4 py-2.5 text-center text-xs font-black text-white hover:bg-teal-600">{action.label}</Link>}
  </div>;
}

export function LoadingState() {
  return <div className="flex items-center justify-center gap-3 py-16 text-xs font-bold text-slate-500"><RefreshCw className="h-5 w-5 animate-spin text-teal-500" />Ачааллаж байна...</div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
    <div className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4" />{message}</div>
    {retry && <button onClick={retry} className="mt-3 rounded-lg bg-rose-600 px-3 py-2 text-xs font-bold text-white">Дахин оролдох</button>}
  </div>;
}
