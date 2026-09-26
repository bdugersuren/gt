'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { errorText, managerApi } from '@/features/manager/api';
import CurriculumVersionManager, { AcademicYear, CurriculumProgram, CurriculumVersion } from '@/components/admin/CurriculumVersionManager';

export default function ProgramCurriculumPage({ params }: { params: { programId: string } }) {
  const [program, setProgram] = useState<CurriculumProgram | null>(null); const [years, setYears] = useState<AcademicYear[]>([]); const [versions, setVersions] = useState<CurriculumVersion[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async () => { setLoading(true); setError(''); try { const [p, y, v] = await Promise.all([managerApi<CurriculumProgram>(`/programs/${params.programId}`), managerApi<AcademicYear[]>('/academic-years'), managerApi<CurriculumVersion[]>(`/programs/${params.programId}/curriculum-versions`)]); setProgram(p); setYears(y); setVersions(v); } catch (e) { setError(errorText(e)); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, [params.programId]);
  if (!program && loading) return <div className="p-6 text-sm text-slate-500">Ачааллаж байна...</div>;
  if (!program) return <div className="p-6"><div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error || 'Хөтөлбөр олдсонгүй'}</div></div>;
  return <div className="space-y-5 p-6"><div><Link href="/admin/programs" className="text-xs text-teal-600">← Хөтөлбөрүүд</Link><h1 className="mt-2 text-2xl font-black">{program.shortName || program.name}</h1><p className="text-sm text-slate-500">{program.name} · {program.code} · {program.durationMonths} сар · Curriculum жагсаалт</p></div>{error && <div className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}<CurriculumVersionManager programId={params.programId} versions={versions} academicYears={years} loading={loading} onReload={load} /></div>;
}
