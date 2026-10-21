'use client';
import { useEffect, useState } from 'react';
import { Database, Pencil, Plus, RefreshCw, Search, Trash2, X } from 'lucide-react';

type Field = { name: string; type: string }; type TableInfo = { name: string; readOnly: boolean; fields: Field[] }; type Result = { rows: Record<string, unknown>[]; total: number; page: number; totalPages: number; readOnly: boolean };
const API = process.env.NEXT_PUBLIC_API_URL || '/api';
async function request(path: string, init: RequestInit = {}) { const res = await fetch(`${API}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}`, ...init.headers } }); const body = await res.json().catch(() => null); if (!res.ok) throw new Error(Array.isArray(body?.message) ? body.message[0] : body?.message || 'Үйлдэл амжилтгүй боллоо'); return body; }

export default function DatabasePage() {
  const [tables, setTables] = useState<TableInfo[]>([]); const [table, setTable] = useState(''); const [result, setResult] = useState<Result | null>(null); const [page, setPage] = useState(1); const [search, setSearch] = useState(''); const [form, setForm] = useState<Record<string, string> | null>(null); const [editId, setEditId] = useState<string | null>(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const selected = tables.find((item) => item.name === table);
  const load = async (nextPage = page) => { if (!table) return; setBusy(true); try { setResult(await request(`/admin/tables/${table}?page=${nextPage}&pageSize=25&search=${encodeURIComponent(search)}`)); setPage(nextPage); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Алдаа гарлаа'); } finally { setBusy(false); } };
  useEffect(() => { request('/admin/tables').then((items: TableInfo[]) => { setTables(items); setTable(items[0]?.name || ''); }).catch((e) => setError(e.message)); }, []); useEffect(() => { if (table) void load(1); }, [table]);
  const open = (row?: Record<string, unknown>) => { setEditId(row?.id ? String(row.id) : null); const next: Record<string, string> = {}; selected?.fields.forEach((field) => { if (!['id', 'createdAt', 'updatedAt'].includes(field.name)) next[field.name] = row?.[field.name] == null ? '' : typeof row[field.name] === 'object' ? JSON.stringify(row[field.name]) : String(row[field.name]); }); setForm(next); };
  const save = async () => { if (!selected || !form) return; setBusy(true); try { await request(`/admin/tables/${selected.name}${editId ? `/${editId}` : ''}`, { method: editId ? 'PATCH' : 'POST', body: JSON.stringify(form) }); setForm(null); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Хадгалахад алдаа гарлаа'); } finally { setBusy(false); } };
  const remove = async (id: unknown) => { if (!selected || !confirm('Энэ мөрийг устгах уу?')) return; try { await request(`/admin/tables/${selected.name}/${id}`, { method: 'DELETE' }); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Устгахад алдаа гарлаа'); } };
  return <div className="mx-auto max-w-[1600px] space-y-5 p-6">
    <div className="flex items-center gap-3">
      <Database className="h-7 w-7 text-orange-500" />
      <div>
        <h1 className="text-xl font-black">
          Өгөгдлийн сангийн удирдлага
        </h1>
        <p className="text-xs text-slate-500">
          Хүснэгтийн өгөгдөл харах, засах, нэмэх
        </p>
      </div>
    </div>
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}
    </div>}
    <div className="grid gap-4 lg:grid-cols-[250px_1fr]">
      <aside className="rounded-2xl border bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
        <p className="px-3 pb-2 text-[10px] font-black uppercase text-slate-400">
          Хүснэгтүүд
        </p>
        {tables.map((item) => <button key={item.name} onClick={() => setTable(item.name)} className={`w-full rounded-xl px-3 py-2 text-left text-xs font-bold ${table === item.name ? 'bg-orange-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}>{item.name}</button>)}
        </aside>
        <section className="min-w-0 rounded-2xl border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-sm font-black">
            {selected?.name}
          </h2>
          {selected?.readOnly && <span className="rounded bg-amber-100 px-2 py-1 text-[10px] text-amber-700">Зөвхөн харах</span>}
          <div className="flex items-center gap-2 rounded-xl border px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && void load(1)} placeholder="Хайх..." className="w-36 bg-transparent text-xs outline-none" />
          </div>
          <button onClick={() => void load()} className="rounded-xl border p-2">
            <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          </button>{selected && !selected.readOnly && <button onClick={() => open()} className="flex items-center gap-1 rounded-xl bg-orange-500 px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4" />
            Нэмэх
          </button>}</div><div className="overflow-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b text-[10px] uppercase text-slate-500">{selected?.fields.slice(0, 10).map((field) => <th key={field.name} className="whitespace-nowrap p-3">{field.name}</th>)}{selected && !selected.readOnly && <th className="p-3">Үйлдэл</th>}</tr></thead><tbody>{result?.rows.map((row, index) => <tr key={String(row.id || index)} className="border-b last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50">{selected?.fields.slice(0, 10).map((field) => <td key={field.name} className="max-w-[240px] whitespace-nowrap p-3" title={String(row[field.name] ?? '')}>{typeof row[field.name] === 'object' ? JSON.stringify(row[field.name]) : String(row[field.name] ?? '—')}</td>)}{selected && !selected.readOnly && <td className="whitespace-nowrap p-3"><button onClick={() => open(row)} className="mr-2 text-blue-500"><Pencil className="h-4 w-4" /></button>{selected.name !== 'User' && <button onClick={() => void remove(row.id)} className="text-rose-500"><Trash2 className="h-4 w-4" /></button>}</td>}</tr>)}</tbody></table>{!busy && !result?.rows.length && <p className="p-10 text-center text-xs text-slate-500">Өгөгдөл алга.</p>}</div>{result && <div className="mt-4 flex items-center justify-between text-xs"><span>Нийт {result.total}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => void load(page - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Өмнөх</button><span className="self-center">{page} / {result.totalPages}</span><button disabled={page >= result.totalPages} onClick={() => void load(page + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Дараах</button></div></div>}</section></div>{form && selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-5 dark:bg-slate-900"><div className="mb-4 flex items-center"><h3 className="mr-auto text-sm font-black">{editId ? 'Мөр засах' : 'Шинэ мөр нэмэх'} — {selected.name}</h3><button onClick={() => setForm(null)}><X /></button></div><div className="grid gap-3 sm:grid-cols-2">{selected.fields.filter((field) => !['id', 'createdAt', 'updatedAt'].includes(field.name)).map((field) => <label key={field.name} className="text-xs font-bold">{field.name}<textarea value={form[field.name] || ''} onChange={(e) => setForm({ ...form, [field.name]: e.target.value })} className="mt-1 w-full rounded-xl border p-2 text-xs font-normal dark:border-slate-700 dark:bg-slate-800" rows={field.type === 'Json' ? 3 : 1} /></label>)}</div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setForm(null)} className="rounded-xl border px-4 py-2 text-xs font-bold">Болих</button><button disabled={busy} onClick={() => void save()} className="rounded-xl bg-orange-500 px-4 py-2 text-xs font-bold text-white">Хадгалах</button></div></div></div>}</div>;
}
