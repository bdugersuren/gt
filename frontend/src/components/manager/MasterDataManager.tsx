'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { errorText, managerApi } from '@/features/manager/api';

type EntityStatus = 'ACTIVE' | 'ARCHIVED';
type Department = { id: string; name: string; code: string; status?: EntityStatus; _count?: { users: number; courses: number; classes: number } };
type Program = { id: string; name: string; code: string; shortName?: string | null; durationMonths: number; status?: EntityStatus; departmentId: string; department?: { name: string; code: string } };
type ClassGroup = { id: string; name: string; code: string; academicYear: string; status?: EntityStatus; departmentId: string; programId?: string; gradeLevel?: number; cohortYear?: number; graduationYear?: number; department: { id: string; name: string; code: string }; program?: Program; _count?: { students: number; enrollments: number } };
type Props = { kind: 'departments' | 'classes' };

export default function MasterDataManager({ kind }: Props) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [status, setStatus] = useState<EntityStatus>('ACTIVE');
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [editing, setEditing] = useState<Department | ClassGroup | null>(null);
  const [confirming, setConfirming] = useState<{ entity: Department | ClassGroup; action: 'archive' | 'delete' } | null>(null);

  const emptyClass = (): ClassGroup => ({ id: '', name: '', code: '', academicYear: '', departmentId: '', programId: '', gradeLevel: 1, cohortYear: new Date().getFullYear(), graduationYear: new Date().getFullYear(), department: { id: '', name: '', code: '' } });
  const load = async () => { setLoading(true); setError(''); try { const [d, c, p] = await Promise.all([managerApi<Department[]>('/departments'), managerApi<ClassGroup[]>('/class-groups'), managerApi<Program[]>('/programs')]); setDepartments(d); setClasses(c); setPrograms(p); } catch (e) { setError(errorText(e)); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);

  const list = useMemo(() => (kind === 'departments' ? departments : classes).filter((item) => {
    const q = search.trim().toLowerCase();
    const matchesStatus = (item.status || 'ACTIVE') === status;
    const matchesDepartment = kind === 'classes' ? (!departmentFilter || (item as ClassGroup).departmentId === departmentFilter) : true;
    return matchesStatus && matchesDepartment && (!q || item.name.toLowerCase().includes(q) || item.code.toLowerCase().includes(q) || ('academicYear' in item && item.academicYear.toLowerCase().includes(q)));
  }), [classes, departments, departmentFilter, kind, search, status]);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!editing || saving) return; setSaving(true); setError(''); setNotice('');
    const form = new FormData(event.currentTarget);
    try {
      if ('academicYear' in editing) {
        await managerApi(`/class-groups${editing.id ? `/${editing.id}` : ''}`, { method: editing.id ? 'PATCH' : 'POST', body: JSON.stringify({ name: form.get('name'), code: form.get('code'), academicYear: form.get('academicYear'), departmentId: form.get('departmentId'), programId: form.get('programId') || undefined, gradeLevel: Number(form.get('gradeLevel')), cohortYear: Number(form.get('cohortYear')), graduationYear: Number(form.get('graduationYear')) }) });
      } else {
        await managerApi(`/departments${editing.id ? `/${editing.id}` : ''}`, { method: editing.id ? 'PATCH' : 'POST', body: JSON.stringify({ name: form.get('name'), code: form.get('code') }) });
      }
      setEditing(null); setNotice('Мэдээлэл амжилттай хадгалагдлаа.'); await load();
    } catch (e) { setError(errorText(e)); } finally { setSaving(false); }
  };
  const runAction = async () => { if (!confirming || saving) return; setSaving(true); try { const path = 'academicYear' in confirming.entity ? 'class-groups' : 'departments'; await managerApi(`/${path}/${confirming.entity.id}${confirming.action === 'archive' ? '/archive' : ''}`, { method: confirming.action === 'archive' ? 'PATCH' : 'DELETE' }); setConfirming(null); setNotice('Үйлдэл амжилттай.'); await load(); } catch (e) { setError(errorText(e)); } finally { setSaving(false); } };
  const title = kind === 'departments' ? 'Тэнхимийн удирдлага' : 'Анги / бүлгийн удирдлага';
  const openNew = () => setEditing(kind === 'departments' ? { id: '', name: '', code: '' } : emptyClass());
  const selectedClassDepartmentId = editing && 'academicYear' in editing ? editing.departmentId : '';
  const availablePrograms = programs.filter((p) => (p.status || 'ACTIVE') === 'ACTIVE' && p.departmentId === selectedClassDepartmentId);

  return <div className="space-y-5 p-6">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h1 className="text-2xl font-black">{title}</h1><p className="mt-1 text-sm text-slate-500">Нэмэх, засах, архивлах болон аюулгүй устгах.</p></div><button onClick={openNew} className="rounded-xl bg-teal-500 px-4 py-3 text-xs font-black text-white">+ {kind === 'departments' ? 'Тэнхим' : 'Анги'} нэмэх</button></div>
    {error && <div role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">{error} <button onClick={() => void load()} className="ml-3 underline">Дахин оролдох</button></div>}
    {notice && <div role="status" className="rounded-xl bg-emerald-50 p-4 text-sm font-bold text-emerald-700">{notice}</div>}
    <div className="grid gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:grid-cols-3"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Нэр, кодоор хайх" className="input"/><select value={status} onChange={(e) => setStatus(e.target.value as EntityStatus)} className="input"><option value="ACTIVE">Идэвхтэй</option><option value="ARCHIVED">Архивлагдсан</option></select>{kind === 'classes' ? <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} className="input"><option value="">Бүх тэнхим</option>{departments.filter((d) => (d.status || 'ACTIVE') === 'ACTIVE').map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}</select> : <div className="rounded-xl bg-slate-50 px-4 py-3 text-xs font-bold">Нийт: {list.length}</div>}</div>
    {loading ? <div className="rounded-2xl border bg-white p-12 text-center text-sm text-slate-500">Ачааллаж байна...</div> : !list.length ? <div className="rounded-2xl border border-dashed bg-white p-12 text-center"><p className="text-sm font-bold text-slate-500">Бүртгэл алга.</p><button onClick={openNew} className="mt-4 rounded-xl bg-teal-500 px-4 py-2 text-xs font-black text-white">Нэмэх</button></div> : <div className="overflow-x-auto rounded-2xl border bg-white shadow-sm"><table className="w-full min-w-[760px] text-left text-xs"><thead className="bg-slate-50 text-slate-500"><tr>{(kind === 'departments' ? ['Код', 'Нэр', 'Хэрэглэгч', 'Курс', 'Анги'] : ['Код', 'Нэр', 'Курс', 'Хичээлийн жил', 'Program товчилсон нэр', 'Тэнхим', 'Суралцагч']).map((h) => <th key={h} className="p-4 font-black">{h}</th>)}<th className="p-4">Үйлдэл</th></tr></thead><tbody>{list.map((item) => <tr key={item.id} className="border-t"><td className="p-4 font-mono font-bold text-teal-600">{item.code}</td><td className="p-4 font-bold">{item.name}</td>{kind === 'departments' ? <><td className="p-4">{(item as Department)._count?.users || 0}</td><td className="p-4">{(item as Department)._count?.courses || 0}</td><td className="p-4">{(item as Department)._count?.classes || 0}</td></> : <><td className="p-4">{(item as ClassGroup).gradeLevel || '—'}</td><td className="p-4">{(item as ClassGroup).academicYear}</td><td className="p-4 font-mono font-bold text-orange-600">{(item as ClassGroup).program?.shortName || (item as ClassGroup).program?.code || '—'}</td><td className="p-4">{(item as ClassGroup).department.code}</td><td className="p-4">{(item as ClassGroup)._count?.students || 0}</td></>}<td className="p-4"><button onClick={() => setEditing(item)} className="mr-2 rounded-lg border px-3 py-2 font-bold">Засах</button>{status === 'ACTIVE' && <button onClick={() => setConfirming({ entity: item, action: 'archive' })} className="mr-2 rounded-lg border border-amber-300 px-3 py-2 font-bold text-amber-700">Архив</button>}<button onClick={() => setConfirming({ entity: item, action: 'delete' })} className="rounded-lg border border-rose-300 px-3 py-2 font-bold text-rose-700">Устгах</button></td></tr>)}</tbody></table></div>}
    {editing && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><form onSubmit={save} className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6 shadow-xl"><div className="flex justify-between"><h2 className="text-lg font-black">{editing.id ? 'Засах' : 'Шинээр нэмэх'}</h2><button type="button" onClick={() => setEditing(null)}>×</button></div><label className="block text-xs font-bold">Нэр<input name="name" required defaultValue={editing.name} className="input mt-1 w-full"/></label><label className="block text-xs font-bold">Код<input name="code" required defaultValue={editing.code} className="input mt-1 w-full font-mono uppercase"/></label>{'academicYear' in editing && <><label className="block text-xs font-bold">Хичээлийн жил<input name="academicYear" required defaultValue={editing.academicYear} placeholder="2026-2027" className="input mt-1 w-full"/></label><label className="block text-xs font-bold">Тэнхим<select name="departmentId" required value={editing.departmentId} onChange={(e) => setEditing({ ...editing, departmentId: e.target.value, programId: '' })} className="input mt-1 w-full"><option value="">Сонгох</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}</select></label><label className="block text-xs font-bold">Хөтөлбөр<select required name="programId" value={editing.programId || ''} onChange={(e) => setEditing({ ...editing, programId: e.target.value || undefined })} disabled={!selectedClassDepartmentId} className="input mt-1 w-full"><option value="">{selectedClassDepartmentId ? 'Хөтөлбөр сонгох' : 'Эхлээд тэнхим сонгоно уу'}</option>{availablePrograms.map((p) => <option key={p.id} value={p.id}>{p.shortName || p.code} — {p.name} · {p.durationMonths} сар</option>)}</select></label><div className="grid grid-cols-3 gap-2"><label className="text-xs font-bold">Курс<input name="gradeLevel" type="number" min="1" required defaultValue={editing.gradeLevel || 1} className="input mt-1 w-full"/></label><label className="text-xs font-bold">Cohort<input name="cohortYear" type="number" min="1900" required defaultValue={editing.cohortYear || new Date().getFullYear()} className="input mt-1 w-full"/></label><label className="text-xs font-bold">Төгсөх он<input name="graduationYear" type="number" min="1900" required defaultValue={editing.graduationYear || new Date().getFullYear()} className="input mt-1 w-full"/></label></div></>}<div className="flex justify-end gap-2"><button type="button" onClick={() => setEditing(null)} className="rounded-xl border px-4 py-2 text-xs font-bold">Болих</button><button disabled={saving} className="rounded-xl bg-teal-500 px-4 py-2 text-xs font-black text-white">Хадгалах</button></div></form></div>}
    {confirming && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="rounded-2xl bg-white p-6"><h2 className="text-lg font-black">Үйлдлийг баталгаажуулах уу?</h2><p className="my-4 text-sm">{confirming.entity.name}</p><button onClick={() => setConfirming(null)} className="mr-2 rounded-xl border px-4 py-2">Болих</button><button onClick={() => void runAction()} className="rounded-xl bg-rose-600 px-4 py-2 text-white">Батлах</button></div></div>}
  </div>;
}
