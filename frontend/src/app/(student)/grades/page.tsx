'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, BarChart3, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL || '/api';

export default function StudentGradesPage() {
  const [data, setData] = useState<any>(null);
  const [courseId, setCourseId] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    const token = localStorage.getItem('token');
    setLoading(true); setError('');
    try {
      const response = await fetch(`${API}/students/me/grades`, { headers: { Authorization: `Bearer ${token}` } });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || 'Дүнгийн мэдээлэл авахад алдаа гарлаа');
      setData(payload);
    } catch (err) { setError(err instanceof Error ? err.message : 'Алдаа гарлаа'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);
  const courses = useMemo(() => (data?.courses || []).filter((item: any) => courseId === 'ALL' || item.course.id === courseId), [data, courseId]);

  return <main className="min-h-screen bg-slate-50 p-6 dark:bg-slate-950">
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div><Link href="/courses" className="inline-flex items-center gap-2 text-xs font-bold text-orange-500"><ArrowLeft className="h-4 w-4" /> Курс руу буцах</Link><h1 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">Миний дүн</h1><p className="text-sm text-slate-500">Бүх курсын нэгдсэн transcript</p></div>
        <button onClick={load} className="rounded-xl border bg-white p-3 text-slate-600 shadow-sm"><RefreshCw className="h-4 w-4" /></button>
      </div>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}
      {loading ? <div className="rounded-2xl bg-white p-12 text-center text-sm text-slate-500">Дүн ачаалж байна...</div> : data && <>
        <div className="grid gap-4 sm:grid-cols-4">
          <Stat label="Дундаж оноо" value={data.summary.averageScore == null ? '—' : `${data.summary.averageScore}%`} />
          <Stat label="Нийт курс" value={data.summary.totalCourses} />
          <Stat label="Дууссан курс" value={data.summary.completedCourses} />
          <Stat label="COMPETENT" value={data.summary.competentCourses} />
        </div>
        <div className="flex justify-end"><select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="rounded-xl border bg-white px-3 py-2 text-sm"><option value="ALL">Бүх курс</option>{(data.courses || []).map((item: any) => <option key={item.course.id} value={item.course.id}>{item.course.code} — {item.course.title}</option>)}</select></div>
        <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Курс</th><th className="px-5 py-4">Progress</th><th className="px-5 py-4">Quiz</th><th className="px-5 py-4">Assignment</th><th className="px-5 py-4">Нэгдсэн дүн</th><th className="px-5 py-4">CBT</th></tr></thead><tbody className="divide-y">{courses.map((item: any) => <tr key={item.course.id}><td className="px-5 py-4"><Link className="font-bold text-orange-600" href={`/courses/${item.course.id}`}>{item.course.code}</Link><p className="text-xs text-slate-500">{item.course.title}</p></td><td className="px-5 py-4">{item.progressPercent}%</td><td className="px-5 py-4">{item.quizScore == null ? '—' : `${Math.round(item.quizScore)}%`}</td><td className="px-5 py-4">{item.assignmentScore == null ? '—' : `${Math.round(item.assignmentScore)}%`}</td><td className="px-5 py-4 font-black">{item.finalScore == null ? '—' : `${Math.round(item.finalScore)}%`}</td><td className="px-5 py-4">{item.cbtStatus}</td></tr>)}</tbody></table></div>
      </>}
    </div>
  </main>;
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl border bg-white p-5 shadow-sm"><BarChart3 className="h-4 w-4 text-orange-500" /><p className="mt-3 text-2xl font-black">{value}</p><p className="text-xs text-slate-500">{label}</p></div>; }
