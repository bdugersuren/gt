'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function StudentLabPage() {
  const [items, setItems] = useState<any[]>([]);
  const [courseId, setCourseId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API}/students/me/lab`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || 'Практик ажлын мэдээлэл авахад алдаа гарлаа');
      setItems(Array.isArray(payload) ? payload : []);
    } catch (err) { setError(err instanceof Error ? err.message : 'Алдаа гарлаа'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const courses = Array.from(new Map(items.map((item) => [item.course.id, item.course])).values());
  const visible = courseId === 'ALL' ? items : items.filter((item) => item.course.id === courseId);

  return <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950"><div className="mx-auto max-w-6xl space-y-6">
    <div className="flex items-center justify-between"><div><Link href="/courses" className="inline-flex items-center gap-2 text-xs font-bold text-orange-500"><ArrowLeft className="h-4 w-4" /> Курс руу буцах</Link><h1 className="mt-3 text-2xl font-black dark:text-white">Практик лаборатори</h1><p className="text-sm text-slate-500">Даалгавар, submission болон үнэлгээ</p></div><button onClick={load} className="rounded-xl border bg-white p-3"><RefreshCw className="h-4 w-4" /></button></div>
    {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
    <div className="flex justify-end"><select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm"><option value="ALL">Бүх курс</option>{courses.map((course: any) => <option key={course.id} value={course.id}>{course.code} — {course.title}</option>)}</select></div>
    {loading ? <div className="rounded-2xl bg-white p-12 text-center text-sm text-slate-500">Даалгавар ачаалж байна...</div> : visible.length === 0 ? <div className="rounded-2xl bg-white p-12 text-center text-sm text-slate-500">Одоогоор практик даалгавар алга.</div> : <div className="grid gap-4 md:grid-cols-2">{visible.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex justify-between gap-4"><div><p className="text-xs font-bold text-orange-600">{item.course.code}</p><h2 className="mt-1 font-black">{item.title}</h2><p className="mt-1 text-xs text-slate-500">{item.lesson.title}</p></div><span className="h-fit rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold">{item.status}</span></div><p className="mt-4 line-clamp-2 text-sm text-slate-600">{item.description}</p><div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('mn-MN') : 'Хугацаа заагаагүй'}</span><Link href={`/lessons/${item.lesson.id}`} className="font-bold text-orange-600">Даалгавар нээх →</Link></div></article>)}</div>}
  </div></main>;
}
