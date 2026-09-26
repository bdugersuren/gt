
'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Archive, GraduationCap, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { errorText, managerApi, ManagerApiError } from '@/features/manager/api';

type AcademicYear = { id: string; name: string; startDate: string; endDate: string };
type Department = { id: string; name: string; code: string };
type Program = { id: string; name: string; code: string; shortName?: string | null; departmentId: string; durationMonths: number };
type ClassGroup = {
  id: string; name: string; code: string; status: 'ACTIVE' | 'ARCHIVED'; academicYear: string;
  departmentId: string; programId: string; gradeLevel?: number | null; cohortYear?: number | null;
  department: Department; program: Pick<Program, 'id' | 'name' | 'code' | 'shortName' | 'durationMonths'>;
  _count?: { students: number; enrollments: number };
};
type FormState = { academicYearId: string; departmentId: string; programId: string; gradeLevel: number; cohortYear: number };

const currentYear = new Date().getFullYear();
const emptyForm: FormState = { academicYearId: '', departmentId: '', programId: '', gradeLevel: 1, cohortYear: currentYear };

function generatedIdentity(program: Program | undefined, form: FormState) {
  if (!program || !form.cohortYear || !form.gradeLevel) return { name: '', code: '' };
  const suffix = `${form.cohortYear}-${form.gradeLevel}`;
  const base = (program.code || 'CLASS').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'CLASS';
  return {
    name: `${program.name.trim()} ${suffix} анги`,
    code: `${base.slice(0, Math.max(2, 20 - suffix.length - 1))}-${suffix}`.slice(0, 20),
  };
}

export default function AdminClassesPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<ClassGroup | null>(null);
  const [query, setQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [programFilter, setProgramFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [y, d, p, c] = await Promise.all([
        managerApi<AcademicYear[]>('/academic-years'),
        managerApi<Department[]>('/departments'),
        managerApi<Program[]>('/programs'),
        managerApi<ClassGroup[]>('/class-groups'),
      ]);
      setYears(y); setDepartments(d); setPrograms(p); setClasses(c);
      setForm((old) => ({ ...old, academicYearId: old.academicYearId || y[0]?.id || '', departmentId: old.departmentId || d[0]?.id || '', programId: old.programId || p[0]?.id || '' }));
    } catch (e) { setError(errorText(e)); } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const availablePrograms = useMemo(() => programs.filter((p) => !form.departmentId || p.departmentId === form.departmentId), [programs, form.departmentId]);
  const filterPrograms = useMemo(() => programs.filter((p) => !departmentFilter || p.departmentId === departmentFilter), [programs, departmentFilter]);
  const selectedProgram = programs.find((p) => p.id === form.programId);
  const maxGrade = Math.max(1, Math.ceil((selectedProgram?.durationMonths || 12) / 12));
  const identity = generatedIdentity(selectedProgram, form);
  const duplicateCombination = classes.some((item) => item.id !== editing?.id && item.programId === form.programId && item.cohortYear === form.cohortYear && item.gradeLevel === form.gradeLevel);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return classes.filter((item) => {
      const matchesQuery = !q || [item.name, item.code, item.academicYear, item.department.name, item.program.name, item.program.code].some((v) => v.toLowerCase().includes(q));
      return matchesQuery && item.status === statusFilter && (!yearFilter || item.academicYear === years.find((y) => y.id === yearFilter)?.name) && (!departmentFilter || item.departmentId === departmentFilter) && (!programFilter || item.programId === programFilter);
    });
  }, [classes, query, statusFilter, yearFilter, departmentFilter, programFilter, years]);

  const closeModal = () => { if (!busy) { setModalOpen(false); setEditing(null); } };
  const openCreate = () => {
    const departmentId = departments[0]?.id || '';
    const program = programs.find((p) => p.departmentId === departmentId) || programs[0];
    setEditing(null); setForm({ academicYearId: years[0]?.id || '', departmentId: program?.departmentId || departmentId, programId: program?.id || '', gradeLevel: 1, cohortYear: currentYear }); setError(''); setNotice(''); setModalOpen(true);
  };
  const openEdit = (item: ClassGroup) => {
    setEditing(item); setForm({ academicYearId: years.find((y) => y.name === item.academicYear)?.id || '', departmentId: item.departmentId, programId: item.programId, gradeLevel: item.gradeLevel || 1, cohortYear: item.cohortYear || currentYear }); setError(''); setNotice(''); setModalOpen(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (busy) return;
    if (!form.academicYearId || !form.departmentId || !form.programId || !form.cohortYear || !form.gradeLevel) { setError('Хичээлийн жил, тэнхим, хөтөлбөр, элсэлтийн он, курсийг бүрэн сонгоно уу.'); return; }
    if (duplicateCombination) { setError('Энэ хөтөлбөр, элсэлтийн он, курсийн анги аль хэдийн байна. Өөр утга сонгоно уу.'); return; }
    setBusy(true); setError(''); setNotice('');
    try {
      const body = { academicYearId: form.academicYearId, departmentId: selectedProgram?.departmentId || form.departmentId, programId: form.programId, gradeLevel: form.gradeLevel, cohortYear: form.cohortYear };
      await managerApi(`/class-groups${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(body) });
      setNotice(editing ? 'Ангийн мэдээлэл шинэчлэгдлээ.' : 'Шинэ анги амжилттай үүслээ.'); closeModal(); await load();
    } catch (e) { setError(e instanceof ManagerApiError ? e.message : errorText(e)); } finally { setBusy(false); }
  };
  const archive = async (item: ClassGroup) => {
    if (!window.confirm(`“${item.name}” ангийг архивлах уу?`)) return;
    setBusy(true); setError('');
    try { await managerApi(`/class-groups/${item.id}/archive`, { method: 'PATCH' }); setNotice('Анги архивлагдлаа.'); await load(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const remove = async (item: ClassGroup) => {
    if (!window.confirm(`“${item.name}” ангийг бүрмөсөн устгах уу? Холбоотой суралцагчтай бол устгах боломжгүй.`)) return;
    setBusy(true); setError('');
    try { await managerApi(`/class-groups/${item.id}`, { method: 'DELETE' }); setNotice('Анги устгагдлаа.'); await load(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  return <div className="space-y-5 p-6">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-widest text-orange-500">Сургалтын зохион байгуулалт</p><h1 className="mt-1 text-2xl font-black">Анги, бүлгийн удирдлага</h1><p className="mt-1 text-sm text-slate-500">Ангийн нэр, кодыг хөтөлбөр, элсэлтийн он, курсээс автоматаар үүсгэнэ.</p></div><button onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-xs font-black text-white hover:bg-orange-600"><Plus className="h-4 w-4" />Шинэ анги</button></div>
    {error && <div className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div>}{notice && <div className="rounded-xl bg-emerald-50 p-3 text-sm font-bold text-emerald-700">{notice}</div>}
    <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm md:grid-cols-5 dark:border-slate-800 dark:bg-slate-900"><label className="flex items-center gap-2 rounded-xl border px-3 md:col-span-2"><Search className="h-4 w-4 text-slate-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Код, нэр, хөтөлбөрөөр хайх" className="w-full bg-transparent py-2 text-sm outline-none" /></label><select value={yearFilter} onChange={(e) => setYearFilter(e.target.value)} className="input"><option value="">Бүх хичээлийн жил</option>{years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select><select value={departmentFilter} onChange={(e) => { setDepartmentFilter(e.target.value); setProgramFilter(''); }} className="input"><option value="">Бүх тэнхим</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}</select><select value={programFilter} onChange={(e) => setProgramFilter(e.target.value)} className="input"><option value="">Бүх хөтөлбөр</option>{filterPrograms.map((p) => <option key={p.id} value={p.id}>{p.shortName || p.code} — {p.name}</option>)}</select><div className="flex items-center gap-2 md:col-span-5"><button onClick={() => setStatusFilter('ACTIVE')} className={`rounded-lg px-3 py-2 text-xs font-black ${statusFilter === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-500'}`}>Идэвхтэй</button><button onClick={() => setStatusFilter('ARCHIVED')} className={`rounded-lg px-3 py-2 text-xs font-black ${statusFilter === 'ARCHIVED' ? 'bg-slate-200 text-slate-700' : 'text-slate-500'}`}>Архив</button><span className="ml-auto text-xs font-bold text-slate-500">{filtered.length} анги</span></div></div>
    {loading ? <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">Ангийн мэдээлэл ачаалж байна...</div> : filtered.length === 0 ? <div className="rounded-2xl border border-dashed p-12 text-center text-sm text-slate-500"><GraduationCap className="mx-auto mb-3 h-9 w-9" />Тохирох анги олдсонгүй.</div> : <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900"><table className="w-full min-w-[1050px] text-left text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-800/60"><tr><th className="p-4">Анги</th><th className="p-4">Хөтөлбөр</th><th className="p-4">Хичээлийн жил</th><th className="p-4">Тэнхим</th><th className="p-4">Суралцагч</th><th className="p-4 text-right">Үйлдэл</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-t dark:border-slate-800"><td className="p-4"><div className="font-mono text-[10px] font-black text-orange-600">{item.code}</div><div className="mt-1 font-bold">{item.name}</div><div className="mt-1 text-[11px] text-slate-500">{item.cohortYear || '—'} cohort · {item.gradeLevel || '—'} курс</div></td><td className="p-4"><div className="font-bold">{item.program.shortName || item.program.code}</div><div className="text-[11px] text-slate-500">{item.program.name}</div></td><td className="p-4 font-medium">{item.academicYear}</td><td className="p-4">{item.department.code} — {item.department.name}</td><td className="p-4"><div className="font-bold">{item._count?.students || 0}</div><div className="text-[10px] text-slate-500">{item._count?.enrollments || 0} enrollment</div></td><td className="p-4"><div className="flex justify-end gap-2"><button onClick={() => openEdit(item)} className="rounded-lg border p-2 text-slate-600 hover:border-orange-400 hover:text-orange-600" title="Засах"><Pencil className="h-4 w-4" /></button>{item.status === 'ACTIVE' && <button onClick={() => void archive(item)} disabled={busy} className="rounded-lg border p-2 text-amber-600 hover:bg-amber-50 disabled:opacity-40" title="Архивлах"><Archive className="h-4 w-4" /></button>}<button onClick={() => void remove(item)} disabled={busy} className="rounded-lg border p-2 text-rose-600 hover:bg-rose-50 disabled:opacity-40" title="Устгах"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>}
    {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={closeModal}><div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900" onClick={(e) => e.stopPropagation()}><div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-black">{editing ? 'Анги засах' : 'Шинэ анги үүсгэх'}</h2><p className="mt-1 text-xs text-slate-500">Нэр болон код автоматаар үүснэ.</p></div><button onClick={closeModal} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button></div><form onSubmit={submit} className="space-y-4"><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-xs font-bold"><span>Хичээлийн жил</span><select required value={form.academicYearId} onChange={(e) => setForm({ ...form, academicYearId: e.target.value })} className="input"><option value="">Сонгоно уу</option>{years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label><label className="space-y-1 text-xs font-bold"><span>Тэнхим</span><select required value={form.departmentId} onChange={(e) => { const next = programs.find((p) => p.departmentId === e.target.value); setForm({ ...form, departmentId: e.target.value, programId: next?.id || '', gradeLevel: 1 }); }} className="input"><option value="">Сонгоно уу</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}</select></label></div><label className="block space-y-1 text-xs font-bold"><span>Хөтөлбөр</span><select required value={form.programId} onChange={(e) => setForm({ ...form, programId: e.target.value, gradeLevel: 1 })} className="input"><option value="">Сонгоно уу</option>{availablePrograms.map((p) => <option key={p.id} value={p.id}>{p.shortName || p.code} — {p.name}</option>)}</select></label><div className="grid gap-4 sm:grid-cols-2"><label className="space-y-1 text-xs font-bold"><span>Cohort / элсэлтийн он</span><input required type="number" min="1900" max="2200" value={form.cohortYear} onChange={(e) => setForm({ ...form, cohortYear: Number(e.target.value) })} className="input" /></label><label className="space-y-1 text-xs font-bold"><span>Курс</span><select required value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: Number(e.target.value) })} className="input">{Array.from({ length: maxGrade }, (_, index) => index + 1).map((grade) => <option key={grade} value={grade}>{grade}-р курс</option>)}</select></label></div><div className="grid gap-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/70"><p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Автоматаар үүсэх утга</p><div><div className="text-sm font-black">{identity.name || 'Хөтөлбөр сонгоно уу'}</div><div className="mt-1 font-mono text-xs font-bold text-orange-600">{identity.code || '—'}</div>{duplicateCombination && <p className="mt-2 text-xs font-bold text-rose-600">Ижил хөтөлбөр + он + курсийн анги бүртгэлтэй байна.</p>}</div></div><div className="flex justify-end gap-2"><button type="button" onClick={closeModal} className="rounded-xl border px-4 py-2.5 text-xs font-bold">Болих</button><button disabled={busy || !identity.code || duplicateCombination} className="rounded-xl bg-orange-500 px-5 py-2.5 text-xs font-black text-white disabled:opacity-50">{busy ? 'Хадгалж байна...' : 'Хадгалах'}</button></div></form></div></div>}
  </div>;
}
