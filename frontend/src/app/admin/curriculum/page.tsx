'use client';
import { useEffect, useState } from 'react';
import { errorText, managerApi } from '@/features/manager/api';
import CurriculumVersionManager, { AcademicYear, CurriculumProgram, CurriculumVersion } from '@/components/admin/CurriculumVersionManager';

export default function CurriculumPage() {
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]); const [years, setYears] = useState<AcademicYear[]>([]); const [versions, setVersions] = useState<CurriculumVersion[]>([]); const [programId, setProgramId] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async (id = programId) => { if (!id) { setVersions([]); setLoading(false); return; } setLoading(true); setError(''); try { setVersions(await managerApi<CurriculumVersion[]>(`/programs/${id}/curriculum-versions`)); } catch (e) { setError(errorText(e)); } finally { setLoading(false); } };
  useEffect(() => { void (async () => { try { const [p, y] = await Promise.all([managerApi<CurriculumProgram[]>('/programs'), managerApi<AcademicYear[]>('/academic-years')]); setPrograms(p); setYears(y); if (p[0]) setProgramId(p[0].id); else setLoading(false); } catch (e) { setError(errorText(e)); setLoading(false); } })(); }, []);
  useEffect(() => { if (programId) void load(programId); }, [programId]);
  return <div className="space-y-5 p-6"><div><h1 className="text-2xl font-black">Сургалтын төлөвлөгөө</h1><p className="text-sm text-slate-500">Хөтөлбөрийн хувилбар, хичээл, улирлын хуваарилалтыг удирдана.</p></div>{error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<div className="rounded-2xl border bg-white p-5"><label className="block text-xs font-bold">Хөтөлбөр<select value={programId} onChange={(e) => setProgramId(e.target.value)} className="input mt-1 max-w-xl"><option value="">Сонгох</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.shortName || p.name} — {p.durationMonths} сар</option>)}</select></label></div>{!programs.length && !loading ? <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">Эхлээд хөтөлбөр үүсгэнэ үү.</div> : <CurriculumVersionManager programId={programId} versions={versions} academicYears={years} loading={loading} onReload={() => load(programId)} />}</div>;
}
