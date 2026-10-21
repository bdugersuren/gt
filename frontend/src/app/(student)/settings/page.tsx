'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function StudentSettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState({ fullName: '', phone: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '' });
  const [preferences, setPreferences] = useState({ notificationEmail: true, notificationInApp: true });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const call = async (path: string, init: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers || {}) } });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.message || 'Үйлдэл амжилтгүй боллоо');
    return payload;
  };

  useEffect(() => {
    Promise.all([call('/users/me'), call('/users/me/preferences')]).then(([user, prefs]) => { setProfile(user); setForm({ fullName: user.fullName || '', phone: user.phone || '' }); setPreferences(prefs); }).catch((err) => setError(err.message));
  }, []);

  const saveProfile = async (event: React.FormEvent) => { event.preventDefault(); try { setProfile(await call('/users/me', { method: 'PATCH', body: JSON.stringify(form) })); setMessage('Профайл хадгалагдлаа'); } catch (err) { setError(err instanceof Error ? err.message : 'Алдаа гарлаа'); } };
  const savePassword = async (event: React.FormEvent) => { event.preventDefault(); try { await call('/users/me/password', { method: 'PATCH', body: JSON.stringify(password) }); setPassword({ currentPassword: '', newPassword: '' }); setMessage('Нууц үг шинэчлэгдлээ'); } catch (err) { setError(err instanceof Error ? err.message : 'Алдаа гарлаа'); } };
  const savePreferences = async () => { try { setPreferences(await call('/users/me/preferences', { method: 'PATCH', body: JSON.stringify(preferences) })); setMessage('Мэдэгдлийн тохиргоо хадгалагдлаа'); } catch (err) { setError(err instanceof Error ? err.message : 'Алдаа гарлаа'); } };

  return <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950"><div className="mx-auto max-w-3xl space-y-6"><Link href="/courses" className="inline-flex items-center gap-2 text-xs font-bold text-orange-500"><ArrowLeft className="h-4 w-4" /> Курс руу буцах</Link><h1 className="text-2xl font-black dark:text-white">Тохиргоо</h1>{message && <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div>}{error && <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <form onSubmit={saveProfile} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-black">Профайл</h2><input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Бүтэн нэр" /><input value={profile?.email || ''} disabled className="w-full rounded-xl border bg-slate-50 px-3 py-2 text-sm" /><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Утас" /><button className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white"><Save className="h-4 w-4" /> Хадгалах</button></form>
    <form onSubmit={savePassword} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-black">Нууц үг солих</h2><input required type="password" value={password.currentPassword} onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Одоогийн нууц үг" /><input required minLength={8} type="password" value={password.newPassword} onChange={(e) => setPassword({ ...password, newPassword: e.target.value })} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Шинэ нууц үг" /><button className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Нууц үг шинэчлэх</button></form>
    <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"><h2 className="font-black">Мэдэгдэл</h2><label className="flex gap-3 text-sm"><input type="checkbox" checked={preferences.notificationEmail} onChange={(e) => setPreferences({ ...preferences, notificationEmail: e.target.checked })} /> Email мэдэгдэл</label><label className="flex gap-3 text-sm"><input type="checkbox" checked={preferences.notificationInApp} onChange={(e) => setPreferences({ ...preferences, notificationInApp: e.target.checked })} /> Системийн мэдэгдэл</label><button onClick={savePreferences} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white">Тохиргоо хадгалах</button></div>
  </div></main>;
}
