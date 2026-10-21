'use client';

import { useEffect, useState } from 'react';
import { Archive, BookOpen, CheckCircle, Download, Pencil, Plus, RefreshCw, Search, Upload, X } from 'lucide-react';

type Book = {
  id: string;
  title: string;
  author?: string;
  isbn?: string;
  publisher?: string;
  publishedYear?: number;
  description?: string;
  language?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' | string;
  downloadAllowed: boolean;
  pdfFileName?: string;
  courses: { id: string; title: string; code?: string }[];
  categories?: { id: string; name: string; code?: string }[];
};

type FormState = {
  title: string;
  author: string;
  isbn: string;
  publisher: string;
  publishedYear: string;
  language: string;
  description: string;
  courseId: string;
  categoryId: string;
  downloadAllowed: boolean;
};

const emptyForm: FormState = {
  title: '', author: '', isbn: '', publisher: '', publishedYear: '', language: 'mn',
  description: '', courseId: '', categoryId: '', downloadAllowed: false,
};

export default function LibraryManagementPage({ role }: { role: 'ADMIN' | 'MANAGER' | 'TEACHER' }) {
  const [books, setBooks] = useState<Book[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [newCategory, setNewCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState('');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const headers = { Authorization: 'Bearer ' + token };

  const load = async () => {
    const res = await fetch(apiUrl + '/library/manage/books?q=' + encodeURIComponent(query), { headers });
    if (res.ok) setBooks((await res.json()).items || []);
    const [courseRes, categoryRes] = await Promise.all([
      fetch(apiUrl + '/courses', { headers: { ...headers, 'x-active-role': role } }),
      fetch(apiUrl + '/library/categories', { headers }),
    ]);
    if (courseRes.ok) setCourses(await courseRes.json());
    if (categoryRes.ok) setCategories(await categoryRes.json());
  };

  useEffect(() => { void load(); }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setFile(null);
    setEditingBook(null);
    setNewCategory('');
  };

  const openCreate = () => {
    resetForm();
    setMessage('');
    setModalOpen(true);
  };

  const openEdit = async (book: Book) => {
    setBusy(true);
    setMessage('');
    try {
      const res = await fetch(apiUrl + '/library/manage/books/' + book.id, { headers });
      const detail = await res.json();
      if (!res.ok) throw new Error(detail.message || 'Номын мэдээлэл авахад алдаа гарлаа');
      setEditingBook(detail);
      setForm({
        title: detail.title || '', author: detail.author || '', isbn: detail.isbn || '',
        publisher: detail.publisher || '', publishedYear: detail.publishedYear ? String(detail.publishedYear) : '',
        language: detail.language || 'mn', description: detail.description || '',
        courseId: detail.courses?.[0]?.id || '', categoryId: detail.categories?.[0]?.id || '',
        downloadAllowed: Boolean(detail.downloadAllowed),
      });
      setFile(null);
      setModalOpen(true);
    } catch (error: any) {
      setMessage(error.message || 'Номын мэдээлэл авахад алдаа гарлаа');
    } finally { setBusy(false); }
  };

  const uploadPdf = async () => {
    if (!file) return undefined;
    const body = new FormData();
    body.append('file', file);
    const upload = await fetch(apiUrl + '/media/upload', { method: 'POST', headers, body });
    const asset = await upload.json();
    if (!upload.ok) throw new Error(asset.message || 'PDF upload амжилтгүй боллоо');
    return asset.id as string;
  };

  const saveBook = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || (!editingBook && !file) || (role === 'TEACHER' && !form.courseId)) {
      setMessage('Номын нэр, шинэ номын PDF файл болон тохирох course сонгоно уу.');
      return;
    }
    setBusy(true); setMessage('');
    try {
      const pdfAssetId = await uploadPdf();
      const payload: any = {
        title: form.title.trim(), author: form.author || undefined, isbn: form.isbn || undefined,
        publisher: form.publisher || undefined, publishedYear: form.publishedYear ? Number(form.publishedYear) : undefined,
        language: form.language || 'mn', description: form.description || undefined,
        downloadAllowed: form.downloadAllowed,
        categoryIds: form.categoryId ? [form.categoryId] : [],
        tagNames: [], courseIds: form.courseId ? [form.courseId] : [],
      };
      if (pdfAssetId) payload.pdfAssetId = pdfAssetId;
      const endpoint = editingBook ? '/library/books/' + editingBook.id : '/library/books';
      const res = await fetch(apiUrl + endpoint, {
        method: editingBook ? 'PATCH' : 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(editingBook ? payload : { ...payload, pdfAssetId }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || 'Ном хадгалахад алдаа гарлаа');
      setModalOpen(false);
      resetForm();
      setMessage(editingBook ? 'Номын мэдээлэл шинэчлэгдлээ.' : (role === 'TEACHER' ? 'Ном draft хэлбэрээр үүслээ. Manager/Admin publish хийнэ.' : 'Ном амжилттай үүслээ.'));
      await load();
    } catch (error: any) {
      setMessage(error.message || 'Алдаа гарлаа');
    } finally { setBusy(false); }
  };

  const createCategory = async () => {
    if (!newCategory.trim()) return;
    const res = await fetch(apiUrl + '/library/categories', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCategory, code: newCategory }),
    });
    const category = await res.json();
    if (!res.ok) { setMessage(category.message || 'Ангилал үүсгэхэд алдаа гарлаа'); return; }
    setCategories(prev => [...prev, category]);
    setForm(prev => ({ ...prev, categoryId: category.id }));
    setNewCategory('');
  };

  const action = async (id: string, endpoint: string) => {
    setBusy(true);
    const res = await fetch(apiUrl + '/library/books/' + id + endpoint, { method: 'POST', headers });
    if (!res.ok) setMessage((await res.json().catch(() => ({}))).message || 'Үйлдэл амжилтгүй');
    else setMessage('Үйлдэл амжилттай.');
    await load();
    setBusy(false);
  };

  const archive = async (book: Book) => {
    if (!window.confirm(`“${book.title}” номыг архивлах уу?`)) return;
    await action(book.id, '/archive');
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3"><BookOpen className="text-orange-500" /><div><h1 className="text-2xl font-black">Цахим номын сан</h1><p className="text-sm text-slate-500">Номын мэдээлэл, PDF, access болон publish төлөвийг удирдана.</p></div></div>
          <button onClick={openCreate} className="rounded-xl bg-orange-500 px-4 py-3 font-bold text-white"><Plus className="mr-1 inline h-4 w-4" /> Ном нэмэх</button>
        </div>
        {message && <p className="rounded-xl bg-slate-100 p-3 text-sm text-slate-700">{message}</p>}
        <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" /><input className="w-full border rounded-xl p-3 pl-10" placeholder="Ном хайх..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && void load()} /></div><button onClick={() => void load()} className="border rounded-xl px-4"><RefreshCw className="w-4 h-4" /></button></div>
        <div className="bg-white rounded-2xl border divide-y">
          {books.length === 0 && <p className="p-8 text-center text-slate-500">Номын бүртгэл алга.</p>}
          {books.map(book => <div key={book.id} className="p-5 flex flex-wrap gap-3 items-center justify-between">
            <div className="min-w-0"><h2 className="font-bold">{book.title}</h2><p className="text-sm text-slate-500">{book.author || 'Зохиогчгүй'} · {book.status} · {book.downloadAllowed ? 'Татах боломжтой' : 'Зөвхөн харах'}</p><p className="text-xs text-slate-400">{book.courses?.map(course => course.code ? `${course.code} — ${course.title}` : course.title).join(', ') || 'Global ном'}</p></div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void openEdit(book)} disabled={busy} className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"><Pencil className="inline w-4 h-4" /> Засах</button>
              {book.status === 'DRAFT' && role !== 'TEACHER' && <button onClick={() => void action(book.id, '/publish')} disabled={busy} className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm disabled:opacity-50"><CheckCircle className="inline w-4 h-4" /> Publish</button>}
              {book.status === 'ARCHIVED' && role !== 'TEACHER' && <button onClick={() => void action(book.id, '/restore')} disabled={busy} className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50">Сэргээх</button>}
              {book.status !== 'ARCHIVED' && <button onClick={() => void archive(book)} disabled={busy} className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"><Archive className="inline w-4 h-4" /> Архивлах</button>}
            </div>
          </div>)}
        </div>
      </div>

      {modalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" onClick={() => !busy && setModalOpen(false)}>
        <div className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl" onClick={event => event.stopPropagation()}>
          <div className="mb-5 flex items-start justify-between"><div><h2 className="text-xl font-black">{editingBook ? 'Номын мэдээлэл засах' : 'Шинэ ном нэмэх'}</h2><p className="mt-1 text-xs text-slate-500">Metadata, PDF болон сурагчийн татах эрхийг тохируулна.</p></div><button disabled={busy} onClick={() => setModalOpen(false)} className="rounded-lg p-2 hover:bg-slate-100"><X /></button></div>
          <form onSubmit={saveBook} className="grid gap-3 md:grid-cols-2">
            <input required className="border rounded-xl p-3" placeholder="Номын нэр *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
            <input className="border rounded-xl p-3" placeholder="Зохиогч" value={form.author} onChange={e => setForm({ ...form, author: e.target.value })} />
            <input className="border rounded-xl p-3" placeholder="ISBN" value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} />
            <input className="border rounded-xl p-3" placeholder="Хэвлэлийн газар" value={form.publisher} onChange={e => setForm({ ...form, publisher: e.target.value })} />
            <input className="border rounded-xl p-3" type="number" min="1000" max="3000" placeholder="Хэвлэгдсэн он" value={form.publishedYear} onChange={e => setForm({ ...form, publishedYear: e.target.value })} />
            <input className="border rounded-xl p-3" placeholder="Хэл: mn" value={form.language} onChange={e => setForm({ ...form, language: e.target.value })} />
            <select required={role === 'TEACHER'} className="border rounded-xl p-3" value={form.courseId} onChange={e => setForm({ ...form, courseId: e.target.value })}><option value="">{role === 'TEACHER' ? 'Course сонгоно уу *' : 'Global ном / Course optional'}</option>{courses.map(course => <option key={course.id} value={course.id}>{course.code} — {course.title}</option>)}</select>
            <select className="border rounded-xl p-3" value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}><option value="">Ангилал сонгох (optional)</option>{categories.map(category => <option key={category.id} value={category.id}>{category.code} — {category.name}</option>)}</select>
            <textarea className="border rounded-xl p-3 md:col-span-2" rows={4} placeholder="Номын тайлбар" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            <div className="rounded-xl border border-dashed p-3 md:col-span-2"><label className="block text-sm font-bold">PDF файл {editingBook ? '(солих бол сонгоно уу)' : '*'}</label>{editingBook && <p className="mt-1 text-xs text-slate-500">Одоогийн файл: {editingBook.pdfFileName || 'PDF файл'}</p>}<input className="mt-2 w-full" required={!editingBook} type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} /></div>
            <label className="flex items-center gap-2 text-sm md:col-span-2"><input type="checkbox" checked={form.downloadAllowed} onChange={e => setForm({ ...form, downloadAllowed: e.target.checked })} /> Сурагч татаж авахыг зөвшөөрөх</label>
            {role !== 'TEACHER' && <div className="flex gap-2 md:col-span-2"><input className="border rounded-xl p-3 flex-1" placeholder="Шинэ ангилал" value={newCategory} onChange={e => setNewCategory(e.target.value)} /><button type="button" onClick={() => void createCategory()} className="border rounded-xl px-3">Ангилал нэмэх</button></div>}
            {message && <p className="text-sm text-rose-600 md:col-span-2">{message}</p>}
            <div className="flex justify-end gap-2 md:col-span-2"><button type="button" disabled={busy} onClick={() => setModalOpen(false)} className="rounded-xl border px-4 py-3">Болих</button><button disabled={busy} className="rounded-xl bg-orange-500 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Хадгалж байна...' : editingBook ? 'Өөрчлөлт хадгалах' : 'Ном үүсгэх'}</button></div>
          </form>
        </div>
      </div>}
    </div>
  );
}
