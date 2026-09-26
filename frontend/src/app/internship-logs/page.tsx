'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, PlusCircle, CheckCircle, Clock, Shield, AlertCircle, MessageSquare } from 'lucide-react';

interface InternshipLog {
  id: string;
  logDate: string;
  hoursWorked: number;
  workSummary: string;
  safetyFollowed: boolean;
  isApproved: boolean;
  mentorFeedback: string | null;
  student?: {
    fullName: string;
  };
}

export default function InternshipLogsPage() {
  const [logs, setLogs] = useState<InternshipLog[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Student form state
  const [showForm, setShowForm] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [hoursWorked, setHoursWorked] = useState(8);
  const [workSummary, setWorkSummary] = useState('');
  const [safetyFollowed, setSafetyFollowed] = useState(true);

  // Mentor evaluation state
  const [evaluatingLogId, setEvaluatingLogId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState('');

  const router = useRouter();

  const fetchLogs = async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      const response = await fetch(`${apiUrl}/internship-logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Дадлагын тэмдэглэлийг татахад алдаа гарлаа');
      }

      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchLogs();
  }, []);

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      const response = await fetch(`${apiUrl}/internship-logs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logDate: new Date(logDate).toISOString(),
          hoursWorked: Number(hoursWorked),
          workSummary,
          safetyFollowed,
        }),
      });

      if (!response.ok) {
        throw new Error('Тэмдэглэл хадгалахад алдаа гарлаа');
      }

      // Refresh
      setWorkSummary('');
      setShowForm(false);
      fetchLogs();
    } catch (err: any) {
      // If offline, save in local IndexedDB or notify
      alert(err.message || 'Офлайн синк одоогоор ажиллаж байна');
    }
  };

  const handleReviewLog = async (logId: string, isApproved: boolean) => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    try {
      const response = await fetch(`${apiUrl}/internship-logs/${logId}/review`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isApproved,
          mentorFeedback: feedbackText,
        }),
      });

      if (!response.ok) {
        throw new Error('Тэмдэглэл баталгаажуулахад алдаа гарлаа');
      }

      setEvaluatingLogId(null);
      setFeedbackText('');
      fetchLogs();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <span className="text-sm font-semibold text-slate-500 animate-pulse">Дадлагын тэмдэглэл ачаалж байна...</span>
      </div>
    );
  }

  const isStudent = user?.roles?.includes('STUDENT');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-slate-900 text-white py-4 px-6 md:px-12 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/courses')} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-300" />
          </button>
          <div>
            <h1 className="font-bold text-sm leading-tight">Үйлдвэрлэлийн дадлагын дэвтэр</h1>
            <p className="text-[10px] text-teal-400 font-bold uppercase tracking-wider">Гурвантамир Коллеж</p>
          </div>
        </div>

        {isStudent && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="bg-teal-500 hover:bg-teal-600 text-white py-2 px-4 rounded-xl text-xs font-bold flex items-center space-x-1 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Тэмдэглэл нэмэх</span>
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full py-12 px-6 grid grid-cols-1 gap-8">
        {/* Student Create Form */}
        {isStudent && showForm && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <h3 className="text-lg font-black text-slate-800 dark:text-white mb-6">Шинэ өдрийн тайлан бүртгэх</h3>
            <form onSubmit={handleCreateLog} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Огноо</label>
                  <input
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Ажилласан цаг</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    required
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase">Хийсэн ажлын тайлан</label>
                <textarea
                  required
                  rows={4}
                  value={workSummary}
                  onChange={(e) => setWorkSummary(e.target.value)}
                  placeholder="Өдрийн турш гүйцэтгэсэн ажилбаруудыг бичнэ үү"
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                />
              </div>

              <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-200/50">
                <input
                  type="checkbox"
                  id="safety"
                  checked={safetyFollowed}
                  onChange={(e) => setSafetyFollowed(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="safety" className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 cursor-pointer">
                  <Shield className="w-3.5 h-3.5 text-teal-500" />
                  ХАБЭА дүрэм мөрдөж, хамгаалалтын хувцас өмссөн эсэх
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-slate-900 text-white dark:bg-teal-500 dark:hover:bg-teal-600 rounded-xl text-xs font-bold"
                >
                  Хадгалах
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Logs List */}
        <div className="space-y-6">
          <h3 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider pl-2">
            {isStudent ? 'Миний өдрийн тэмдэглэлүүд' : 'Хянаж батлах оюутны тэмдэглэлүүд'}
          </h3>

          {logs.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <p className="text-slate-500 text-xs">Тэмдэглэл одоогоор байхгүй байна.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-slate-400 font-mono">
                        📅 {new Date(log.logDate).toLocaleDateString('mn-MN')}
                      </span>
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-teal-500" /> {log.hoursWorked} цаг
                      </span>
                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5 text-teal-500" /> {log.safetyFollowed ? 'ХАБЭА дагасан' : 'ХАБЭА дагаагүй'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {log.isApproved ? (
                        <span className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Батлагдсан
                        </span>
                      ) : (
                        <span className="bg-amber-50 border border-amber-100 text-amber-600 text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Хүлээгдэж буй
                        </span>
                      )}
                    </div>
                  </div>

                  {!isStudent && log.student && (
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Суралцагч: {log.student.fullName}</p>
                  )}

                  <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed whitespace-pre-line">
                    {log.workSummary}
                  </p>

                  {/* Mentor Comments section */}
                  {log.mentorFeedback ? (
                    <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex gap-2">
                      <MessageSquare className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">Дадлага удирдагчийн сэтгэгдэл:</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{log.mentorFeedback}</p>
                      </div>
                    </div>
                  ) : null}

                  {/* Mentor Review Form */}
                  {!isStudent && !log.isApproved && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                      {evaluatingLogId === log.id ? (
                        <div className="space-y-3 mt-2">
                          <textarea
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            placeholder="Оюутанд өгөх санал сэтгэгдэл..."
                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setEvaluatingLogId(null)}
                              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg text-xs"
                            >
                              Цуцлах
                            </button>
                            <button
                              onClick={() => handleReviewLog(log.id, true)}
                              className="px-4 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold"
                            >
                              Батлах
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEvaluatingLogId(log.id)}
                          className="bg-slate-900 hover:bg-slate-800 text-white py-2 px-4 rounded-xl text-xs font-bold"
                        >
                          Тэмдэглэлийг хянаж үнэлэх
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
        © 2026 "Гурвантамир" Политехник Коллеж LMS
      </footer>
    </div>
  );
}
