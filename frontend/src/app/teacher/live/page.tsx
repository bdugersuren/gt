'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Radio, Plus, Calendar, Clock, X, Check, Trash2, Zap, ArrowLeft, Loader2, BookOpen
} from 'lucide-react';

export default function TeacherLiveDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create Modal
  const [showCreate, setShowCreate] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [creating, setCreating] = useState(false);
  
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const loadData = async () => {
    setLoading(true);
    const token = getToken();
    try {
      // Get teacher courses
      const courseRes = await fetch(`${apiUrl}/courses`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourses(courseData);
      }

      // Get all live sessions for all courses
      const sessionRes = await fetch(`${apiUrl}/live-sessions/course/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Fallback: fetch sessions per course if "all" endpoint is not custom or returns 404
      if (sessionRes.ok) {
        setSessions(await sessionRes.json());
      } else {
        // Fallback to fetch for each course manually
        const allSessions: any[] = [];
        if (courses.length > 0) {
          for (const course of courses) {
            const res = await fetch(`${apiUrl}/live-sessions/course/${course.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.ok) {
              const data = await res.json();
              allSessions.push(...data);
            }
          }
        }
        setSessions(allSessions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [courses.length]);

  const handleCreate = async () => {
    if (!title.trim() || !selectedCourseId) {
      showToast('Гарчиг болон курс сонгох шаардлагатай.', 'error');
      return;
    }
    const token = getToken();
    setCreating(true);
    try {
      const res = await fetch(`${apiUrl}/live-sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          courseId: selectedCourseId,
          scheduledAt: scheduledAt || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      showToast('Live хичээл амжилттай үүслээ');
      setTitle('');
      setSelectedCourseId('');
      setScheduledAt('');
      setShowCreate(false);
      loadData();
    } catch {
      showToast('Live хичээл үүсгэхэд алдаа гарлаа', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleStart = async (sessionId: string) => {
    const token = getToken();
    try {
      const res = await fetch(`${apiUrl}/live-sessions/${sessionId}/start`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      showToast('Хичээл эхэллээ');
      loadData();
    } catch {
      showToast('Эхлүүлэхэд алдаа гарлаа', 'error');
    }
  };

  const handleEnd = async (sessionId: string) => {
    if (!confirm('Live хичээлийг хаах уу?')) return;
    const token = getToken();
    try {
      const res = await fetch(`${apiUrl}/live-sessions/${sessionId}/end`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      showToast('Хичээл амжилттай хаагдлаа');
      loadData();
    } catch {
      showToast('Хаахад алдаа гарлаа', 'error');
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!confirm('Live хичээлийг устгах уу?')) return;
    const token = getToken();
    try {
      const res = await fetch(`${apiUrl}/live-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      showToast('Устгагдлаа');
      loadData();
    } catch {
      showToast('Устгахад алдаа гарлаа', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4 sm:p-6">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/teacher" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white leading-tight">Live хичээлийн удирдах самбар</h2>
            <p className="text-xs text-slate-400 mt-1">Оюутнуудтайгаа бодит цагт холбогдож, интерактив санал асуулга явуулах</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/10 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Шинэ live хичээл үүсгэх
        </button>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
          <Radio className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Live хичээл бүртгэгдээгүй байна</p>
          <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
            Одоогоор идэвхтэй болон төлөвлөгдсөн live хичээл алга байна.
            Баруун дээд товчоор шинэ хичээл төлөвлөнө үү.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <div
              key={session.id}
              className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between hover:shadow-md transition-all"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 font-mono tracking-widest">
                    PIN: {session.sessionCode}
                  </span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                    session.status === 'LIVE' ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' :
                    session.status === 'ENDED' ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800' :
                    'bg-blue-500/10 text-blue-500 border-blue-500/20'
                  }`}>
                    {session.status === 'LIVE' ? 'Идэвхтэй' :
                     session.status === 'ENDED' ? 'Дууссан' : 'Төлөвлөсөн'}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-3 leading-snug line-clamp-2">
                  {session.title}
                </h3>
                
                {session.course && (
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                    {session.course.title}
                  </p>
                )}

                <div className="space-y-1.5 mt-4 text-[10px] text-slate-400 font-medium">
                  {session.scheduledAt && (
                    <p className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Төлөвлөсөн: {new Date(session.scheduledAt).toLocaleString()}
                    </p>
                  )}
                  {session.startedAt && (
                    <p className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Эхэлсэн: {new Date(session.startedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-4">
                {session.status === 'SCHEDULED' && (
                  <>
                    <button
                      onClick={() => handleStart(session.id)}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[11px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Эхлүүлэх
                    </button>
                    <button
                      onClick={() => handleDelete(session.id)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-slate-200 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900 rounded-xl transition-all"
                      title="Устгах"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}

                {session.status === 'LIVE' && (
                  <>
                    <Link
                      href={`/teacher/live/${session.sessionCode}`}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-orange-500/10"
                    >
                      <Radio className="w-3.5 h-3.5" />
                      Удирдах цонх
                    </Link>
                    <button
                      onClick={() => handleEnd(session.id)}
                      className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold py-2 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
                    >
                      Дуусгах
                    </button>
                  </>
                )}

                {session.status === 'ENDED' && (
                  <div className="w-full text-center py-1 text-[10px] text-slate-400 italic">
                    Энэ хичээл хаагдсан байна.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Шинэ live хичээл</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Курс сонгох *</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none"
                >
                  <option value="">— Курс сонгох —</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Гарчиг *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Жишээ: Цахилгаан хэлхээний аюулгүй ажиллагаа"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Төлөвлөсөн огноо, цаг</label>
                <input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none text-slate-800 dark:text-slate-200"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="text-xs text-slate-500 px-4 py-2 border border-slate-200 rounded-xl"
                >
                  Болих
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !title.trim() || !selectedCourseId}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5"
                >
                  {creating ? 'Үүсгэж байна...' : 'Хадгалах'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-bounce">
          <div className={`px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border text-xs font-bold ${
            toast.type === 'success'
              ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/10'
              : 'bg-rose-500 border-rose-600 text-white shadow-rose-500/10'
          }`}>
            {toast.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <X className="w-4 h-4 shrink-0" />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

    </div>
  );
}
