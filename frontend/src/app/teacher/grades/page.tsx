'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardCheck, RefreshCw, Search, Users } from 'lucide-react';

type GradeRow = {
  id: string;
  score: number | null;
  finalScore: number | null;
  cbtResult: string;
  submittedAt: string;
  student: { id: string; fullName: string; code?: string; email?: string };
  assignment: { id: string; title: string; lessonTitle: string };
  course: { id: string; code: string; title: string };
};

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

function statusLabel(status: string) {
  if (status === 'COMPETENT') return 'Тэнцсэн';
  if (status === 'NOT_YET_COMPETENT') return 'Тэнцээгүй';
  if (status === 'RE_ASSESSMENT_REQ') return 'Дахин үнэлэх';
  return 'Үнэлээгүй';
}

export default function TeacherGradesPage() {
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [courseId, setCourseId] = useState('ALL');
  const [status, setStatus] = useState('ALL');

  const loadGrades = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`${apiUrl}/submissions/teacher/grades`, {
        headers: { Authorization: `Bearer ${token}`, 'x-active-role': 'TEACHER' },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || 'Дүнгийн мэдээлэл авахад алдаа гарлаа');
      setRows(Array.isArray(payload) ? payload : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Дүнгийн мэдээлэл авахад алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGrades(); }, [loadGrades]);

  const courses = useMemo(() => Array.from(new Map(rows.map((row) => [row.course.id, row.course])).values()), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const haystack = `${row.student.fullName} ${row.student.code || ''} ${row.assignment.title} ${row.course.code} ${row.course.title}`.toLowerCase();
    return (!query.trim() || haystack.includes(query.trim().toLowerCase()))
      && (courseId === 'ALL' || row.course.id === courseId)
      && (status === 'ALL' || row.cbtResult === status);
  }), [rows, query, courseId, status]);

  const evaluated = rows.filter((row) => row.finalScore !== null).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-orange-500">Багшийн удирдлага</p>
          <h1 className="mt-1 text-2xl font-black text-slate-900 dark:text-white">Дүн &amp; Үнэлгээ</h1>
          <p className="mt-1 text-sm text-slate-500">Танд хуваарилагдсан курсуудын суралцагчдын даалгавар, үнэлгээ.</p>
        </div>
        <button onClick={loadGrades} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50">
          <RefreshCw className="h-4 w-4" /> Шинэчлэх
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><ClipboardCheck className="h-5 w-5 text-orange-500" /><p className="mt-3 text-2xl font-black">{rows.length}</p><p className="text-xs text-slate-500">Нийт илгээлт</p></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><CheckCircle2 className="h-5 w-5 text-emerald-500" /><p className="mt-3 text-2xl font-black">{evaluated}</p><p className="text-xs text-slate-500">Үнэлсэн илгээлт</p></div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm"><Users className="h-5 w-5 text-blue-500" /><p className="mt-3 text-2xl font-black">{new Set(rows.map((row) => row.student.id)).size}</p><p className="text-xs text-slate-500">Суралцагч</p></div>
      </div>
      <div className="flex flex-wrap gap-3 rounded-2xl border bg-white p-4 shadow-sm">
        <label className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Суралцагч, курс, даалгавар хайх" className="w-full rounded-xl border px-9 py-2 text-sm outline-none focus:border-orange-400" /></label>
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="ALL">Бүх курс</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code} — {course.title}</option>)}</select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-3 py-2 text-sm"><option value="ALL">Бүх төлөв</option><option value="NOT_EVALUATED">Үнэлээгүй</option><option value="COMPETENT">Тэнцсэн</option><option value="NOT_YET_COMPETENT">Тэнцээгүй</option><option value="RE_ASSESSMENT_REQ">Дахин үнэлэх</option></select>
      </div>
      {error && <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"><AlertCircle className="h-4 w-4" />{error}</div>}
      <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm">
        {loading ? <div className="p-12 text-center text-sm text-slate-500">Дүнгийн мэдээлэл ачаалж байна...</div> : filtered.length === 0 ? <div className="p-12 text-center text-sm text-slate-500">Одоогоор харуулах илгээлт алга.</div> : <table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-4">Суралцагч</th><th className="px-5 py-4">Курс</th><th className="px-5 py-4">Даалгавар</th><th className="px-5 py-4">Илгээсэн</th><th className="px-5 py-4 text-center">Оноо</th><th className="px-5 py-4 text-center">Төлөв</th></tr></thead><tbody className="divide-y">{filtered.map((row) => <tr key={row.id} className="hover:bg-slate-50"><td className="px-5 py-4"><p className="font-bold">{row.student.fullName}</p><p className="text-xs text-slate-500">{row.student.code || row.student.email || '—'}</p></td><td className="px-5 py-4"><span className="font-bold text-orange-600">{row.course.code}</span><p className="text-xs text-slate-500">{row.course.title}</p></td><td className="px-5 py-4"><p className="font-semibold">{row.assignment.title}</p><p className="text-xs text-slate-500">{row.assignment.lessonTitle}</p></td><td className="px-5 py-4 text-slate-500">{new Date(row.submittedAt).toLocaleDateString('mn-MN')}</td><td className="px-5 py-4 text-center font-black">{row.finalScore === null ? '—' : `${Math.round(row.finalScore)}%`}</td><td className="px-5 py-4 text-center"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${row.cbtResult === 'COMPETENT' ? 'bg-emerald-100 text-emerald-700' : row.cbtResult === 'NOT_YET_COMPETENT' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>{statusLabel(row.cbtResult)}</span></td></tr>)}</tbody></table>}
      </div>
    </div>
  );
}
