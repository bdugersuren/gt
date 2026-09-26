'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { errorText, managerApi, managerQueries, Department } from '@/features/manager/api';

type ClassGroup = { id: string; name: string; code: string; academicYear: string; programId: string; department: { id: string; name: string; code: string }; _count?: { students: number; enrollments: number } };
type Program = { id: string; name: string; code: string; departmentId: string; shortName?: string | null };

export default function AdminSetupPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [department, setDepartment] = useState({ name: '', code: '' });
  const [classGroup, setClassGroup] = useState({ name: '', code: '', academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1), departmentId: '', programId: '' });

  const load = async () => {
    setError('');
    try {
      const [d, c, u, coursesData, p] = await Promise.all([
        managerQueries.departments(),
        managerApi<ClassGroup[]>('/class-groups'),
        managerApi<any[]>('/users'),
        managerQueries.courses(),
        managerApi<Program[]>('/programs'),
      ]);
      setDepartments(d); setClasses(c); setUsers(u); setCourses(coursesData); setPrograms(p);
      setClassGroup((old) => ({ ...old, departmentId: old.departmentId || d[0]?.id || '', programId: old.programId || p.find((item) => item.departmentId === (old.departmentId || d[0]?.id))?.id || '' }));
    } catch (e) { setError(errorText(e)); }
  };

  useEffect(() => { void load(); }, []);

  const createDepartment = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await managerApi('/departments', { method: 'POST', body: JSON.stringify(department) });
      setDepartment({ name: '', code: '' }); setNotice('Тэнхим амжилттай нэмэгдлээ.'); await load();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  const createClassGroup = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await managerApi('/class-groups', { method: 'POST', body: JSON.stringify(classGroup) });
      setClassGroup((old) => ({ ...old, name: '', code: '' })); setNotice('Анги/бүлэг амжилттай нэмэгдлээ.'); await load();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return <div className="space-y-6 p-6">
    <div><h1 className="text-2xl font-black">Системийн анхны тохиргоо</h1><p className="mt-1 text-sm text-slate-500">Production өгөгдлийг дарааллын дагуу үүсгэнэ.</p></div>
    {error && <div className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error}</div>}
    {notice && <div className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</div>}
    <div className="grid gap-3 sm:grid-cols-4">{[
      ['Тэнхим', departments.length, '/admin/setup'], ['Анги/бүлэг', classes.length, '/admin/setup'], ['Хэрэглэгч', users.length, '/admin'], ['Курс', courses.length, '/manager/courses'],
    ].map(([label, count, href]) => <Link href={href as string} key={label as string} className="rounded-2xl border bg-white p-5 shadow-sm hover:border-teal-400"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black">{count}</p></Link>)}</div>
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={createDepartment} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-black">1. Тэнхим нэмэх</h2><input required placeholder="Тэнхимийн нэр" value={department.name} onChange={e => setDepartment({ ...department, name: e.target.value })} className="input w-full" /><input required maxLength={10} placeholder="Код: VET-AGR" value={department.code} onChange={e => setDepartment({ ...department, code: e.target.value.toUpperCase() })} className="input w-full font-mono" /><button disabled={busy} className="w-full rounded-xl bg-teal-500 py-3 text-sm font-black text-white disabled:opacity-50">Тэнхим хадгалах</button></form>
      <form onSubmit={createClassGroup} className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm"><h2 className="text-lg font-black">2. Анги/бүлэг нэмэх</h2><input required placeholder="Ангийн нэр" value={classGroup.name} onChange={e => setClassGroup({ ...classGroup, name: e.target.value })} className="input w-full" /><input required maxLength={20} placeholder="Код: CLASS-AGR-3A" value={classGroup.code} onChange={e => setClassGroup({ ...classGroup, code: e.target.value.toUpperCase() })} className="input w-full font-mono" /><input required placeholder="2026-2027" value={classGroup.academicYear} onChange={e => setClassGroup({ ...classGroup, academicYear: e.target.value })} className="input w-full" /><select required value={classGroup.departmentId} onChange={e => setClassGroup({ ...classGroup, departmentId: e.target.value, programId: programs.find((item) => item.departmentId === e.target.value)?.id || '' })} className="input w-full"><option value="">Тэнхим сонгох</option>{departments.map(d => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}</select><select required value={classGroup.programId} onChange={e => setClassGroup({ ...classGroup, programId: e.target.value })} className="input w-full"><option value="">Хөтөлбөр сонгох</option>{programs.filter((item) => item.departmentId === classGroup.departmentId).map((item) => <option key={item.id} value={item.id}>{item.shortName || item.code} — {item.name}</option>)}</select><button disabled={busy || !departments.length} className="w-full rounded-xl bg-slate-900 py-3 text-sm font-black text-white disabled:opacity-50">Анги хадгалах</button></form>
    </div>
    <div className="rounded-2xl border bg-white p-6 shadow-sm"><h2 className="mb-4 text-lg font-black">Одоогийн master data</h2><div className="grid gap-3 md:grid-cols-2">{departments.map(d => <div key={d.id} className="rounded-xl bg-slate-50 p-4"><b>{d.code}</b><p className="text-sm text-slate-600">{d.name}</p><p className="mt-1 text-xs text-slate-400">{d._count?.classes || 0} анги · {d._count?.users || 0} хэрэглэгч · {d._count?.courses || 0} курс</p></div>)}{classes.map(c => <div key={c.id} className="rounded-xl bg-teal-50 p-4"><b>{c.code}</b><p className="text-sm text-slate-600">{c.name} · {c.academicYear}</p><p className="mt-1 text-xs text-slate-400">{c.department.code} · {c._count?.students || 0} суралцагч</p></div>)}</div></div>
  </div>;
}
