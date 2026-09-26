'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { errorText, managerApi } from '@/features/manager/api';

type Department = { id: string; name: string; code: string };
type Level = 'PROFESSIONAL_EDUCATION_III_IV' | 'TECHNICAL_EDUCATION_V_VI' | 'VOCATIONAL_TRAINING_I_V';
type ProgramType = 'STANDARD' | 'SHORT_COURSE';
type Program = { id: string; name: string; code: string; shortName?: string | null; durationMonths: number; programType: ProgramType; qualificationLevel: Level; status?: 'ACTIVE' | 'ARCHIVED'; department: Department };
type Form = { name: string; code: string; durationMonths: number; programType: ProgramType; qualificationLevel: Level; departmentId: string };

const labels: Record<Level, string> = { PROFESSIONAL_EDUCATION_III_IV: 'Мэргэжлийн боловсрол (III-IV)', TECHNICAL_EDUCATION_V_VI: 'Техникийн боловсрол (V-VI)', VOCATIONAL_TRAINING_I_V: 'Мэргэжлийн сургалт (I-V)' };
const shorts: Record<Level, string> = { PROFESSIONAL_EDUCATION_III_IV: 'МБ', TECHNICAL_EDUCATION_V_VI: 'ТБ', VOCATIONAL_TRAINING_I_V: 'МС' };
const duration = (months: number) => months % 12 === 0 ? `${months / 12} ЖИЛ` : months === 18 ? '1.5 ЖИЛ' : `${months} САР`;
const shortName = (name: string, level: Level, months: number) => `${name.trim().toUpperCase()}(${shorts[level]}-${duration(months)})`;
const emptyForm = (departmentId = ''): Form => ({ name: '', code: '', durationMonths: 36, programType: 'STANDARD', qualificationLevel: 'PROFESSIONAL_EDUCATION_III_IV', departmentId });

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [form, setForm] = useState<Form>(emptyForm());
  const [editing, setEditing] = useState<Program | null>(null);
  const [open, setOpen] = useState(false);
  const [archived, setArchived] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const generated = useMemo(() => shortName(form.name, form.qualificationLevel, form.durationMonths), [form]);

  const load = async () => {
    try {
      const [rows, deps] = await Promise.all([managerApi<Program[]>('/programs'), managerApi<Department[]>('/departments')]);
      setPrograms(rows); setDepartments(deps);
      setForm((old) => ({ ...old, departmentId: old.departmentId || deps[0]?.id || '' }));
    } catch (e) { setError(errorText(e)); }
  };
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => { if (event.key === 'Escape' && !busy) setOpen(false); };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, [open, busy]);

  const create = () => { setError(''); setEditing(null); setForm(emptyForm(departments[0]?.id || '')); setOpen(true); };
  const edit = (program: Program) => {
    setError(''); setEditing(program);
    setForm({ name: program.name, code: program.code, durationMonths: program.durationMonths, programType: program.programType, qualificationLevel: program.qualificationLevel, departmentId: program.department.id });
    setOpen(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      await managerApi(`/programs${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify({ ...form, shortName: generated }) });
      setOpen(false); setEditing(null); setNotice(editing ? 'Хөтөлбөр шинэчлэгдлээ.' : 'Шинэ хөтөлбөр үүслээ.'); await load();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const archiveProgram = async (program: Program) => {
    if (!window.confirm(`“${program.name}” хөтөлбөрийг архивлах уу?`)) return;
    setBusy(true); setError('');
    try { await managerApi(`/programs/${program.id}/archive`, { method: 'PATCH' }); setNotice('Хөтөлбөр архивлагдлаа.'); await load(); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  const deleteProgram = async (program: Program) => {
    if (!window.confirm(`“${program.name}” хөтөлбөрийг бүрмөсөн устгах уу? Энэ үйлдлийг буцаах боломжгүй.`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await managerApi(`/programs/${program.id}`, { method: 'DELETE' });
      setNotice('Хөтөлбөр бүрмөсөн устгагдлаа.');
      await load();
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };

  const visible = archived ? programs : programs.filter((program) => program.status !== 'ARCHIVED');
  return <div className="space-y-5 p-6">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-black">Сургалтын хөтөлбөр</h1><p className="text-sm text-slate-500">Modal цонхоор үүсгэх, засах, архивлах боломжтой.</p></div><div className="flex gap-2"><label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-xs font-bold"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Архивлагдсан</label><button type="button" onClick={create} className="rounded-xl bg-teal-600 px-4 py-2.5 text-xs font-black text-white hover:bg-teal-700">+ Шинэ хөтөлбөр</button></div></div>
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{notice && <div role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</div>}
    <div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full text-left text-xs"><thead className="bg-slate-50"><tr>{['Товчилсон нэр', 'Код', 'Нэр', 'Мэргэшлийн түвшин', 'Хугацаа', 'Тэнхим', 'Төлөв', 'Үйлдэл'].map((h) => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{visible.map((program) => <tr key={program.id} className={`border-t ${program.status === 'ARCHIVED' ? 'bg-slate-50 text-slate-400' : ''}`}><td className="p-4 font-mono font-bold text-orange-600">{program.shortName || 'Тохируулаагүй'}</td><td className="p-4 font-mono font-bold text-teal-600">{program.code}</td><td className="p-4 font-bold"><Link href={`/admin/programs/${program.id}/curriculum`} className="text-teal-700 underline">{program.name}</Link></td><td className="p-4">{labels[program.qualificationLevel]}</td><td className="p-4">{program.durationMonths} сар</td><td className="p-4">{program.department.name}</td><td className="p-4">{program.status === 'ARCHIVED' ? 'Архивлагдсан' : 'Идэвхтэй'}</td><td className="whitespace-nowrap p-4"><button type="button" onClick={() => edit(program)} className="mr-2 rounded-lg border px-3 py-2 font-bold">Засах</button>{program.status !== 'ARCHIVED' && <button type="button" disabled={busy} onClick={() => void archiveProgram(program)} className="mr-2 rounded-lg border border-rose-200 px-3 py-2 font-bold text-rose-600">Архивлах</button>}<button type="button" disabled={busy} onClick={() => void deleteProgram(program)} className="rounded-lg border border-red-300 px-3 py-2 font-bold text-red-700 hover:bg-red-50">Устгах</button></td></tr>)}</tbody></table>{!visible.length && <p className="p-10 text-center text-xs text-slate-500">Хөтөлбөрийн мэдээлэл алга.</p>}</div>
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setOpen(false); }}><form onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="program-modal-title" className="w-full max-w-2xl space-y-5 rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="program-modal-title" className="text-xl font-black">{editing ? 'Хөтөлбөр засах' : 'Шинэ хөтөлбөр үүсгэх'}</h2><p className="mt-1 text-xs text-slate-500">Товчилсон нэр автоматаар тооцогдоно.</p></div><button type="button" onClick={() => !busy && setOpen(false)} aria-label="Хаах"><X className="h-5 w-5" /></button></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold sm:col-span-2">Хөтөлбөрийн нэр<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input mt-1 w-full" placeholder="Мал эмнэлэг" /></label><label className="text-xs font-bold">Код<input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} className="input mt-1 w-full font-mono" placeholder="VET-AGR" /></label><label className="text-xs font-bold">Автомат товчилсон нэр<input value={generated} readOnly className="input mt-1 w-full bg-slate-100 font-mono" /></label><label className="text-xs font-bold">Мэргэшлийн түвшин<select required value={form.qualificationLevel} onChange={(e) => setForm({ ...form, qualificationLevel: e.target.value as Level })} className="input mt-1 w-full">{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="text-xs font-bold">Сургалтын төрөл<select value={form.programType} onChange={(e) => setForm({ ...form, programType: e.target.value as ProgramType })} className="input mt-1 w-full"><option value="STANDARD">Үндсэн хөтөлбөр</option><option value="SHORT_COURSE">Богино сургалт</option></select></label><label className="text-xs font-bold">Хугацаа (сар)<input required type="number" min="1" max="120" value={form.durationMonths} onChange={(e) => setForm({ ...form, durationMonths: Number(e.target.value) })} className="input mt-1 w-full" /></label><label className="text-xs font-bold">Тэнхим<select required value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} className="input mt-1 w-full"><option value="">Тэнхим сонгох</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.code} — {department.name}</option>)}</select></label></div>{error && <div role="alert" className="rounded-xl bg-rose-50 p-3 text-xs font-bold">{error}</div>}<div className="flex justify-end gap-2"><button type="button" onClick={() => !busy && setOpen(false)} className="rounded-xl border px-5 py-2.5 text-xs font-bold">Болих</button><button disabled={busy} className="rounded-xl bg-teal-600 px-5 py-2.5 text-xs font-black text-white">{busy ? 'Хадгалж байна...' : editing ? 'Шинэчлэх' : 'Үүсгэх'}</button></div></form></div>}
  </div>;
}
