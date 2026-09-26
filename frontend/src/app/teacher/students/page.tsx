'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Users, BookOpen, GraduationCap } from 'lucide-react';
import { errorText, managerApi } from '@/features/manager/api';

type TeacherStudent = {
  id: string;
  fullName: string;
  email: string;
  code: string;
  registerNumber?: string | null;
  phone?: string | null;
  status: string;
  enrollmentYear?: number | null;
  classes: Array<{ id: string; name: string; code: string }>;
  courses: Array<{ id: string; title: string; code: string; statuses: string[] }>;
};

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<TeacherStudent[]>([]);
  const [query, setQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setError('');
        setStudents(await managerApi<TeacherStudent[]>('/users/teacher/students'));
      } catch (e) {
        setError(errorText(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const courses = useMemo(() => {
    const map = new Map<string, { id: string; title: string; code: string }>();
    students.forEach((student) => student.courses.forEach((course) => map.set(course.id, course)));
    return Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code));
  }, [students]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return students.filter((student) => {
      const matchesQuery = !q || [student.fullName, student.code, student.email, student.phone || '', ...student.classes.map((item) => item.code)].some((value) => value.toLowerCase().includes(q));
      const matchesCourse = !courseFilter || student.courses.some((course) => course.id === courseFilter);
      return matchesQuery && matchesCourse;
    });
  }, [students, query, courseFilter]);

  return <div className="space-y-5">
    <div><p className="text-xs font-black uppercase tracking-widest text-orange-500">Багшийн удирдлага</p><h1 className="mt-1 text-2xl font-black">Оюутны явц</h1><p className="mt-1 text-sm text-slate-500">Таны хуваарилагдсан хичээлд бүртгэлтэй оюутнууд.</p></div>
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border bg-white p-5"><Users className="h-5 w-5 text-orange-500"/><p className="mt-3 text-xs text-slate-500">Нийт оюутан</p><p className="mt-1 text-2xl font-black">{students.length}</p></div><div className="rounded-2xl border bg-white p-5"><BookOpen className="h-5 w-5 text-teal-500"/><p className="mt-3 text-xs text-slate-500">Миний хичээл</p><p className="mt-1 text-2xl font-black">{courses.length}</p></div><div className="rounded-2xl border bg-white p-5"><GraduationCap className="h-5 w-5 text-indigo-500"/><p className="mt-3 text-xs text-slate-500">Идэвхтэй оюутан</p><p className="mt-1 text-2xl font-black">{students.filter((student) => student.status === 'ACTIVE').length}</p></div></div>
    <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 sm:flex-row"><label className="flex flex-1 items-center gap-2 rounded-xl border px-3"><Search className="h-4 w-4 text-slate-400"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Нэр, код, email эсвэл ангиар хайх" className="w-full bg-transparent py-2 text-sm outline-none"/></label><select value={courseFilter} onChange={(e) => setCourseFilter(e.target.value)} className="input sm:w-80"><option value="">Бүх миний хичээл</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.code} — {course.title}</option>)}</select></div>
    {loading ? <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">Оюутны мэдээлэл ачаалж байна...</div> : !filtered.length ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center text-sm text-slate-500">Тохирох оюутан олдсонгүй.</div> : <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[850px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Оюутан</th><th className="p-4">Холбоо барих</th><th className="p-4">Анги</th><th className="p-4">Хичээл</th><th className="p-4">Төлөв</th></tr></thead><tbody>{filtered.map((student) => <tr key={student.id} className="border-t"><td className="p-4"><div className="font-bold">{student.fullName}</div><div className="mt-1 font-mono text-[10px] text-slate-500">{student.code}</div></td><td className="p-4"><div>{student.email}</div><div className="mt-1 text-slate-500">{student.phone || 'Утасгүй'}</div></td><td className="p-4"><div className="flex flex-wrap gap-1">{student.classes.length ? student.classes.map((group) => <span key={group.id} className="rounded-full bg-slate-100 px-2 py-1 font-bold">{group.code}</span>) : <span className="text-slate-400">Ангигүй</span>}</div></td><td className="p-4"><div className="flex max-w-sm flex-wrap gap-1">{student.courses.map((course) => <span key={course.id} className={`rounded-full px-2 py-1 font-bold ${courseFilter === course.id ? 'bg-orange-100 text-orange-700' : 'bg-teal-50 text-teal-700'}`}>{course.code}</span>)}</div></td><td className="p-4"><span className="rounded-full bg-emerald-50 px-2 py-1 font-bold text-emerald-700">{student.status}</span></td></tr>)}</tbody></table></div>}
  </div>;
}
