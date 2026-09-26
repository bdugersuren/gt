'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle2, AlertCircle, FileText, ClipboardCheck, ArrowRight, HelpCircle } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface Assignment {
  id: string;
  title: string;
  description: string;
  maxScore: number;
  rubrics: {
    id: string;
    title: string;
    weight: number;
    criteria: {
      id: string;
      description: string;
      points: number;
    }[];
  }[];
}

interface Quiz {
  id: string;
  title: string;
  timeLimitMin: number;
}

interface LessonDetails {
  id: string;
  title: string;
  contentType: string;
  contentBody: string;
  videoUrl?: string;
  moduleId: string;
  module?: {
    courseId: string;
  };
  assignments: Assignment[];
  quizzes: Quiz[];
}

export default function LessonPlayerPage() {
  const [lesson, setLesson] = useState<LessonDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Assignment submission states
  const [submitting, setSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState('');
  const [submissionFile, setSubmissionFile] = useState('');
  const [existingSubmission, setExistingSubmission] = useState<any>(null);

  const router = useRouter();
  const params = useParams();
  const lessonId = params.id as string;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchLessonDetails = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const response = await fetch(`${apiUrl}/lessons/${lessonId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Лекцийн агуулгыг татахад алдаа гарлаа');
        }

        const data = await response.json();
        setLesson(data);

        // Fetch existing submission for the first assignment if present
        if (data.assignments && data.assignments.length > 0) {
          const submissionsResponse = await fetch(apiUrl + '/submissions/mine', {
            headers: { 'Authorization': 'Bearer ' + token },
          });
          if (submissionsResponse.ok) {
            const submissions = await submissionsResponse.json();
            const latest = submissions.find((submission: any) => submission.assignmentId === data.assignments[0].id);
            if (latest) setExistingSubmission(latest);
          }
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLessonDetails();
  }, [lessonId]);

  const handleCompleteLesson = async () => {
    if (typeof window === 'undefined' || !lesson) return;
    const token = localStorage.getItem('token');
    
    // Call API (will also work offline since OfflineSyncProvider caches it)
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    try {
      await fetch(`${apiUrl}/lessons/${lesson.id}/complete`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (err) {
      setError('Хичээл дуусгах хүсэлт амжилтгүй боллоо');
      return;
    }

    const courseId = lesson.module?.courseId || '';
    router.push(courseId ? `/courses/${courseId}` : '/courses');
  };

  const handleSubmitAssignment = async (assignmentId: string) => {
    if (typeof window === 'undefined' || !submissionFile) return;
    setSubmitting(true);
    setSubmissionSuccess('');

    const token = localStorage.getItem('token');
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    try {
      const response = await fetch(API_URL + '/submissions', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assignmentId, linkUrl: submissionFile }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || 'Даалгавар илгээхэд алдаа гарлаа');
      }
      const saved = await response.json();
      setExistingSubmission(saved);
      setSubmissionSuccess('Таны даалгаврыг амжилттай хүлээн авлаа. Багш/Ментор шалгаж үнэлсний дараа дүн харагдана.');
    } catch (err: any) {
      setSubmissionSuccess('');
      setError(err.message || 'Даалгавар илгээхэд алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <span className="text-sm font-semibold text-slate-500 animate-pulse">Лекцийг ачаалж байна...</span>
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-rose-600 font-semibold mb-4">Алдаа: {error || 'Лекц олдсонгүй'}</p>
        <Link href="/courses" className="text-sm text-teal-500 font-bold hover:underline">
          Буцах
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between">
      {/* Header */}
      <header className="bg-slate-900 text-white py-4 px-6 md:px-12 flex items-center gap-4 shadow-md">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <span className="text-[9px] font-extrabold text-teal-400 uppercase tracking-widest">{lesson.contentType} лекц</span>
          <h1 className="font-bold text-sm leading-tight">{lesson.title}</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl mx-auto w-full py-12 px-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Lesson Player */}
        <div className="lg:col-span-2 space-y-8">
          {/* Mock Video player if HLS is present */}
          {lesson.videoUrl && (
            <div className="bg-black aspect-video rounded-3xl overflow-hidden relative shadow-lg group">
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 z-10">
                <p className="text-white text-xs font-bold uppercase tracking-widest px-4 py-2 border border-white/20 rounded-xl bg-black/40">
                  HLS Adaptive Video Streaming Active (.m3u8)
                </p>
              </div>
              <video
                src={lesson.videoUrl}
                controls
                className="w-full h-full object-cover"
                poster="https://images.unsplash.com/photo-1588072432836-e10032774350?q=80&w=800"
              />
            </div>
          )}

          {/* Markdown Content */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
            <MarkdownRenderer content={lesson.contentBody || ''} />
          </div>

          {/* Action Footer */}
          <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <div>
              <h4 className="text-sm font-bold text-slate-800 dark:text-white">Энэ хэсгийг дуусгах уу?</h4>
              <p className="text-xs text-slate-400">Дуусгаснаар дараах лекц цоожгүй нээгдэнэ.</p>
            </div>
            <button
              onClick={handleCompleteLesson}
              className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white py-3 px-6 rounded-2xl text-xs font-bold flex items-center space-x-1.5 transition-all shadow-md shadow-emerald-500/15"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Хичээлийг дуусгах</span>
            </button>
          </div>
        </div>

        {/* Right Column: Quiz and Assignments */}
        <div className="space-y-8">
          {/* Quizzes Section */}
          {lesson.quizzes && lesson.quizzes.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-teal-500" />
                Үнэлгээний сорил
              </h4>
              {lesson.quizzes.map((quiz) => (
                <div key={quiz.id} className="p-4 border border-teal-100 dark:border-teal-900 bg-teal-50/20 dark:bg-teal-950/10 rounded-2xl text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Сорилын хугацаа: {quiz.timeLimitMin} минут</p>
                  <h5 className="font-bold text-sm text-slate-800 dark:text-white mb-4">{quiz.title}</h5>
                  <Link href={`/quizzes/${quiz.id}`}>
                    <button className="w-full bg-teal-500 hover:bg-teal-600 active:scale-95 text-white py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 transition-all">
                      <span>Сорил эхлүүлэх</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {/* Assignments and Rubrics Section */}
          {lesson.assignments && lesson.assignments.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
              <h4 className="text-sm font-extrabold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck className="w-4 h-4 text-blue-500" />
                Практик даалгавар
              </h4>

              {lesson.assignments.map((assign) => (
                <div key={assign.id} className="space-y-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                    <h5 className="font-bold text-xs text-slate-800 dark:text-white mb-2">{assign.title}</h5>
                    <p className="text-slate-500 text-[11px] leading-relaxed mb-4">{assign.description}</p>
                    
                    {/* Rubrics matrix */}
                    <div className="space-y-2 mb-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Үнэлгээний рубрик шалгуурууд:</p>
                      {assign.rubrics.map((r) => (
                        <div key={r.id} className="p-2 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
                          <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300">{r.title} (Жин: {r.weight}%)</p>
                          {r.criteria.map((c) => (
                            <p key={c.id} className="text-[10px] text-slate-400 leading-normal mt-0.5">• {c.description} (Дээд оноо: {c.points})</p>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Submission status / Form */}
                    {existingSubmission ? (
                      <div className="p-3 border border-emerald-100 dark:border-emerald-950 bg-emerald-50/20 dark:bg-emerald-950/10 rounded-xl text-center space-y-2">
                        <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider inline-block">
                          Илгээсэн
                        </span>
                        <p className="text-[11px] text-slate-500">Илгээсэн файл: {(existingSubmission.assets?.[0]?.asset?.publicUrl || existingSubmission.linkUrl)}</p>
                        {existingSubmission.score !== null ? (
                          <div className="p-2 bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg text-left">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Үнэлгээ: {existingSubmission.cbtResult} ({existingSubmission.score} оноо)</p>
                            <p className="text-[10px] text-slate-400 mt-1">Багшийн сэтгэгдэл: {existingSubmission.feedback}</p>
                          </div>
                        ) : (
                          <p className="text-[10px] text-slate-400 italic">Багш/Ментор хянаж байна.</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {submissionSuccess && (
                          <div className="p-3 text-[11px] text-emerald-700 bg-emerald-50 rounded-xl flex items-start gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-500 mt-0.5" />
                            <span>{submissionSuccess}</span>
                          </div>
                        )}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Практик видео эсвэл тайлангийн холбоос (Link/URL)</label>
                          <input
                            type="text"
                            value={submissionFile}
                            onChange={(e) => setSubmissionFile(e.target.value)}
                            placeholder="Миний видео эсвэл тайлангийн холбоосыг энд оруулна уу"
                            className="w-full p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] rounded-xl focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                        <button
                          onClick={() => handleSubmitAssignment(assign.id)}
                          disabled={submitting || !submissionFile}
                          className="w-full bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold py-2 px-4 rounded-xl transition-all disabled:opacity-50"
                        >
                          {submitting ? 'Илгээж байна...' : 'Даалгаврыг илгээх'}
                        </button>
                      </div>
                    )}
                  </div>
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
