'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Download, BookOpen, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function StudentLibraryBookPage() {
  const params = useParams();
  const id = params.id as string;
  const [book, setBook] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [downloadBusy, setDownloadBusy] = useState(false);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    const token = localStorage.getItem('token');
    (async () => {
      const bookRes = await fetch(apiUrl + '/library/books/' + id, { headers: { Authorization: 'Bearer ' + token } });
      if (!bookRes.ok) { setError((await bookRes.json().catch(() => ({}))).message || 'Ном олдсонгүй'); setLoading(false); return; }
      setBook(await bookRes.json());
      const pdfRes = await fetch(apiUrl + '/library/books/' + id + '/pdf', { headers: { Authorization: 'Bearer ' + token } });
      if (pdfRes.ok) {
        const blob = await pdfRes.blob();
        setPdfUrl(URL.createObjectURL(blob));
      } else setError((await pdfRes.json().catch(() => ({}))).message || 'PDF үзэх эрхгүй эсвэл файл олдсонгүй');
      setLoading(false);
    })();
  }, [id]);

  useEffect(() => () => { if (pdfUrl) URL.revokeObjectURL(pdfUrl); }, [pdfUrl]);

  const download = async () => {
    setDownloadBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(apiUrl + '/library/books/' + id + '/download', { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) { setError((await res.json().catch(() => ({}))).message || 'Татах эрхгүй байна'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${book?.title || 'book'}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally { setDownloadBusy(false); }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (error && !book) return <div className="min-h-screen p-8 text-center text-rose-600">{error}</div>;
  return <div className="min-h-screen bg-slate-50 p-5 md:p-8"><div className="max-w-6xl mx-auto space-y-5"><Link href="/library" className="text-sm text-slate-500"><ArrowLeft className="inline w-4 h-4" /> Номын сан руу буцах</Link><div className="bg-white rounded-2xl border p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-black">{book?.title}</h1><p className="text-slate-500">{book?.author || 'Зохиогчгүй'} {book?.publishedYear ? '· ' + book.publishedYear : ''}</p></div>{book?.downloadAllowed && <button disabled={downloadBusy} onClick={download} className="rounded-xl bg-orange-500 text-white px-4 py-2 disabled:opacity-50"><Download className="inline w-4 h-4 mr-1" /> {downloadBusy ? 'Татаж байна...' : 'Татах'}</button>}</div>{error && <p className="mt-3 text-sm text-rose-600">{error}</p>}</div><div className="bg-slate-200 rounded-2xl p-2 min-h-[70vh]">{pdfUrl ? <iframe title={book?.title} src={pdfUrl} className="w-full h-[75vh] rounded-xl bg-white" /> : <div className="h-[70vh] flex items-center justify-center text-slate-500"><BookOpen className="mr-2" /> PDF харагдахгүй байна</div>}</div></div></div>;
}
