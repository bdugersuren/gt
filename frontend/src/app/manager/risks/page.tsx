'use client';
import { useEffect, useState } from 'react';
import { DropoutRisk, errorText, managerQueries } from '@/features/manager/api';
import { ErrorState, LoadingState, PageHeader } from '@/features/manager/ui';

export default function RisksPage() {
  const [risks, setRisks] = useState<DropoutRisk[]>(); const [error, setError] = useState(''); const load = async () => { setError(''); try { setRisks(await managerQueries.risks()); } catch (e) { setError(errorText(e)); } }; useEffect(() => { void load(); }, []);
  if (!risks && !error) return <LoadingState />; if (error) return <ErrorState message={error} retry={load} />;
  return <div className="space-y-5"><PageHeader title="Явц ба dropout эрсдэл" description="Эрсдэлийн оноогоор эрэмбэлсэн суралцагчдын жагсаалт." /><div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><table className="w-full text-left text-xs"><thead className="bg-slate-50 text-slate-500 dark:bg-slate-800"><tr><th className="p-4">Суралцагч</th><th className="p-4">Код</th><th className="p-4">Оноо</th><th className="p-4">Төлөв</th></tr></thead><tbody>{[...risks!].sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0)).map((risk) => <tr key={risk.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-4 font-bold">{risk.fullName}</td><td className="p-4 font-mono">{risk.code}</td><td className="p-4">{risk.riskScore ?? 0}</td><td className="p-4"><span className={`rounded-full px-2 py-1 font-bold ${risk.riskStatus === 'HIGH' ? 'bg-rose-100 text-rose-700' : risk.riskStatus === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>{risk.riskStatus}</span></td></tr>)}</tbody></table>{risks!.length === 0 && <p className="p-10 text-center text-slate-500">Эрсдэлийн мэдээлэл алга байна.</p>}</div></div>;
}
