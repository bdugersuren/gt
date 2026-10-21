'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Search, Download } from 'lucide-react';

export default function StudentLibraryPage() {
  const [books, setBooks] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';

  const load = async () => {
    const token = localStorage.getItem('token');
    setLoading(true);
    const res = await fetch(apiUrl + '/library/books?q=' + encodeURIComponent(query), { headers: { Authorization: 'Bearer ' + token } });
    if (!res.ok) setError((await res.json().catch(() => ({}))).message || 'Номын сан ачааллахад алдаа гарлаа');
    else setBooks((await res.json()).items || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return <div className="min-h-screen bg-slate-50 p-6 md:p-10"><div className="max-w-7xl mx-auto space-y-6">
    <div className="flex items-center gap-3"><BookOpen className="text-orange-500" /><div><h1 className="text-2xl font-black">Цахим номын сан</h1><p className="text-sm text-slate-500">Танд зөвшөөрөгдсөн сургалтын PDF материалууд.</p></div></div>
    <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" /><input className="w-full border rounded-xl p-3 pl-10" placeholder="Ном, зохиогч, ISBN хайх..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && load()} /></div><button onClick={load} className="bg-orange-500 text-white rounded-xl px-5">Хайх</button></div>
    {error && <div className="rounded-xl bg-rose-50 text-rose-700 p-4">{error}</div>}
    {loading ? <p className="text-center p-10 text-slate-500">Ачаалж байна...</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {books.map(book => <Link key={book.id} href={'/library/' + book.id} className="bg-white rounded-2xl border p-5 hover:shadow-md transition-shadow"><div className="h-36 rounded-xl bg-orange-50 flex items-center justify-center mb-4"><BookOpen className="w-12 h-12 text-orange-500" /></div><h2 className="font-bold line-clamp-2">{book.title}</h2><p className="text-sm text-slate-500 mt-2">{book.author || 'Зохиогчгүй'}</p><p className="text-xs text-slate-400 mt-3">{book.accessType === 'GLOBAL' ? 'Нийтийн сургалтын сан' : 'Курсын материал'}</p></Link>)}
      {books.length === 0 && <p className="col-span-full text-center p-10 text-slate-500">Танд харагдах ном олдсонгүй.</p>}
    </div>}
  </div></div>;
}
