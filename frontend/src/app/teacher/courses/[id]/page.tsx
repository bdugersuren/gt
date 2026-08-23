'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft, BookOpen, FileText, Plus, Trash2,
  Save, Video, Layout, Info, Check, HelpCircle,
  ClipboardList, Calendar, ChevronDown, ChevronRight,
  X, Award, Clock, Target, Database, PlusCircle, Paperclip,
  Loader2, Copy, ExternalLink, Edit2, BarChart2, Eye, EyeOff,
  Radio, Zap, ShieldAlert,
  Bold, Italic, Link2, Image as LucideImage, Sigma, GitFork, Layers, Compass
} from 'lucide-react';
import { MediaUploader } from '@/components/MediaUploader';
import MarkdownRenderer from '@/components/MarkdownRenderer';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Lesson {
  id: string;
  title: string;
  order: number;
  contentType: string;
  contentBody?: string;
  videoUrl?: string;
  pdfUrl?: string;
  quizzes?: QuizSummary[];
  assignments?: AssignmentSummary[];
}

interface Module {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
}

interface CourseDetails {
  id: string;
  title: string;
  code: string;
  description: string;
  isCBT: boolean;
  modules: Module[];
}

interface Question {
  id: string;
  text: string;
  type: string;
  points: number;
  optionsJson: any;
  correctAnswer: string;
  explanation?: string;
  createdAt: string;
}

interface QuizSummary {
  id: string;
  title: string;
  timeLimitMin: number;
  passScore: number;
  quizQuestions: { question: { points: number } }[];
}

interface AssignmentSummary {
  id: string;
  title: string;
  dueDate: string;
  maxScore: number;
}

// ─── Component ───────────────────────────────────────────────────────────────
export default function TeacherCourseEditor() {
  const params = useParams();
  const courseId = params.id as string;
  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

  // ── Core States ──
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mainTab, setMainTab] = useState<'content' | 'media' | 'questions' | 'quizzes' | 'schedule' | 'live'>('content');

  // ── Toast ──
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ── Content Tab States ──
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [contentEditorTab, setContentEditorTab] = useState<'markdown' | 'video' | 'pdf'>('markdown');
  const [markdownContent, setMarkdownContent] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    const replacement = before + selectedText + after;

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setMarkdownContent(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };
  const [videoLocks, setVideoLocks] = useState<{ timestamp: number; quizId: string }[]>([]);
  const [pdfLocks, setPdfLocks] = useState<{ lockPage: number; quizId: string }[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  const [videoTimestamp, setVideoTimestamp] = useState('');
  const [videoLockQuizId, setVideoLockQuizId] = useState('');
  const [pdfPage, setPdfPage] = useState('');
  const [pdfLockQuizId, setPdfLockQuizId] = useState('');
  // For video/pdf URL direct input
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [pdfUrlInput, setPdfUrlInput] = useState('');
  const [previewMode, setPreviewMode] = useState(false);

  // Add Module / Lesson
  const [showAddModule, setShowAddModule] = useState(false);
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [addingModule, setAddingModule] = useState(false);
  const [showAddLesson, setShowAddLesson] = useState<string | null>(null); // moduleId
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonType, setNewLessonType] = useState('MARKDOWN');
  const [addingLesson, setAddingLesson] = useState(false);

  // ── Question Bank States ──
  const [questions, setQuestions] = useState<Question[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [newQText, setNewQText] = useState('');
  const [newQType, setNewQType] = useState('MULTIPLE_CHOICE');
  const [newQOptions, setNewQOptions] = useState(['А', 'Б', 'В', 'Г']);
  const [newQCorrect, setNewQCorrect] = useState('А');
  const [newQPoints, setNewQPoints] = useState(1);
  const [newQExplanation, setNewQExplanation] = useState('');
  const [addingQuestion, setAddingQuestion] = useState(false);

  // ── Quiz States ──
  const [showCreateQuiz, setShowCreateQuiz] = useState(false);
  const [newQuizTitle, setNewQuizTitle] = useState('');
  const [newQuizTimeLimit, setNewQuizTimeLimit] = useState(30);
  const [newQuizPassScore, setNewQuizPassScore] = useState(60);
  const [newQuizLessonId, setNewQuizLessonId] = useState('');
  const [selectedQIds, setSelectedQIds] = useState<Set<string>>(new Set());
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [filterQuestionType, setFilterQuestionType] = useState<string>('ALL');
  // Quiz stats modal
  const [quizStatsId, setQuizStatsId] = useState<string | null>(null);
  const [quizStats, setQuizStats] = useState<any>(null);
  const [quizStatsLoading, setQuizStatsLoading] = useState(false);

  // ── Live Session States ──
  const [liveSessions, setLiveSessions] = useState<any[]>([]);
  const [liveSessionsLoading, setLiveSessionsLoading] = useState(false);
  const [showCreateLive, setShowCreateLive] = useState(false);
  const [liveTitle, setLiveTitle] = useState('');
  const [liveScheduledAt, setLiveScheduledAt] = useState('');
  const [creatingLive, setCreatingLive] = useState(false);
  // Edit question state
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [editQText, setEditQText] = useState('');
  const [editQCorrect, setEditQCorrect] = useState('');

  // ─── Data Loading ──────────────────────────────────────────────────────────
  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchCourse = useCallback(async () => {
    const token = getToken();
    try {
      const res = await fetch(`${apiUrl}/courses/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Хичээлийн мэдээлэл авахад алдаа гарлаа');
      const data = await res.json();
      setCourse(data);
      // Expand all modules by default
      if (data.modules) {
        setExpandedModules(new Set(data.modules.map((m: Module) => m.id)));
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId, apiUrl]);

  const fetchQuestions = useCallback(async () => {
    const token = getToken();
    setQuestionsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/quizzes/course/${courseId}/questions`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Асуулт татахад алдаа гарлаа');
      const data = await res.json();
      setQuestions(data);
    } catch {
      setQuestions([]);
    } finally {
      setQuestionsLoading(false);
    }
  }, [courseId, apiUrl]);

  const fetchLiveSessions = useCallback(async () => {
    const token = getToken();
    setLiveSessionsLoading(true);
    try {
      const res = await fetch(`${apiUrl}/live-sessions/course/${courseId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      setLiveSessions(await res.json());
    } catch {
      setLiveSessions([]);
    } finally {
      setLiveSessionsLoading(false);
    }
  }, [courseId, apiUrl]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  useEffect(() => {
    if (mainTab === 'questions' || mainTab === 'quizzes') {
      fetchQuestions();
    } else if (mainTab === 'live') {
      fetchLiveSessions();
    }
  }, [mainTab, fetchQuestions, fetchLiveSessions]);

  // ─── Content Tab Handlers ──────────────────────────────────────────────────
  const handleLessonSelect = (lesson: Lesson) => {
    setActiveLesson(lesson);
    setSaveSuccess(false);
    setMarkdownContent(lesson.contentBody || '');
    setVideoLocks([]);
    setPdfLocks([]);
    setVideoUrlInput(lesson.videoUrl || '');
    setPdfUrlInput(lesson.pdfUrl || '');
    const saved = typeof window !== 'undefined' ? localStorage.getItem(`gating_${lesson.id}`) : null;
    if (saved) {
      const g = JSON.parse(saved);
      setVideoLocks(g.videoLocks || []);
      setPdfLocks(g.pdfLocks || []);
    }
    if (lesson.contentType === 'PDF') setContentEditorTab('pdf');
    else if (lesson.contentType === 'VIDEO_HLS') setContentEditorTab('video');
    else setContentEditorTab('markdown');
  };

  // Save lesson content to DB via API
  const handleSaveContent = async () => {
    if (!activeLesson) return;
    const token = getToken();
    setSaving(true);
    try {
      const body: any = { contentBody: markdownContent };
      if (videoUrlInput) body.videoUrl = videoUrlInput;
      if (pdfUrlInput) body.pdfUrl = pdfUrlInput;
      // Save gating locks to localStorage (UI-only feature)
      localStorage.setItem(`gating_${activeLesson.id}`, JSON.stringify({ videoLocks, pdfLocks }));
      const res = await fetch(`${apiUrl}/lessons/${activeLesson.id}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Хадгалахад алдаа гарлаа');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      showToast('Хичээлийн агуулга амжилттай хадгалагдлаа');
    } catch (err: any) {
      showToast(err.message || 'Хадгалахад алдаа гарлаа', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Add a video timestamp lock
  const handleAddVideoLock = () => {
    const ts = parseInt(videoTimestamp);
    if (!ts || !videoLockQuizId.trim()) return;
    if (videoLocks.find(l => l.timestamp === ts)) return;
    setVideoLocks(v => [...v, { timestamp: ts, quizId: videoLockQuizId.trim() }]);
    setVideoTimestamp('');
    setVideoLockQuizId('');
  };

  // Add a PDF page lock
  const handleAddPdfLock = () => {
    const page = parseInt(pdfPage);
    if (!page || !pdfLockQuizId.trim()) return;
    if (pdfLocks.find(l => l.lockPage === page)) return;
    setPdfLocks(v => [...v, { lockPage: page, quizId: pdfLockQuizId.trim() }]);
    setPdfPage('');
    setPdfLockQuizId('');
  };

  const handleAddModule = async () => {
    if (!newModuleTitle.trim()) return;
    const token = getToken();
    setAddingModule(true);
    try {
      const nextOrder = (course?.modules.length ?? 0) + 1;
      const res = await fetch(`${apiUrl}/modules`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newModuleTitle.trim(), courseId, order: nextOrder }),
      });
      if (!res.ok) throw new Error();
      setNewModuleTitle('');
      setShowAddModule(false);
      fetchCourse();
    } catch {
      alert('Модуль нэмэхэд алдаа гарлаа');
    } finally {
      setAddingModule(false);
    }
  };

  const handleAddLesson = async (moduleId: string) => {
    if (!newLessonTitle.trim()) return;
    const token = getToken();
    setAddingLesson(true);
    try {
      const mod = course?.modules.find(m => m.id === moduleId);
      const nextOrder = (mod?.lessons.length ?? 0) + 1;
      const res = await fetch(`${apiUrl}/lessons`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newLessonTitle.trim(), moduleId, contentType: newLessonType, order: nextOrder }),
      });
      if (!res.ok) throw new Error();
      setNewLessonTitle('');
      setNewLessonType('MARKDOWN');
      setShowAddLesson(null);
      fetchCourse();
    } catch {
      alert('Лекц нэмэхэд алдаа гарлаа');
    } finally {
      setAddingLesson(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Энэ модулийг устгах уу? Дотроо байгаа бүх хичээл устах болно!')) return;
    const token = getToken();
    const res = await fetch(`${apiUrl}/modules/${moduleId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) showToast('Модуль устгагдлаа');
    else showToast('Устгахад алдаа гарлаа', 'error');
    fetchCourse();
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!confirm('Энэ лекцийг устгах уу?')) return;
    const token = getToken();
    const res = await fetch(`${apiUrl}/lessons/${lessonId}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) showToast('Лекц устгагдлаа');
    else showToast('Устгахад алдаа гарлаа', 'error');
    if (activeLesson?.id === lessonId) setActiveLesson(null);
    fetchCourse();
  };

  // ─── Question Bank Handlers ────────────────────────────────────────────────
  const handleAddQuestion = async () => {
    if (!newQText.trim()) return;
    const token = getToken();
    setAddingQuestion(true);
    const optionsJson = newQType === 'MULTIPLE_CHOICE'
      ? newQOptions.map((opt, i) => ({ label: String.fromCharCode(65 + i), text: opt }))
      : newQType === 'TRUE_FALSE'
        ? [{ label: 'Үнэн', text: 'Үнэн' }, { label: 'Худал', text: 'Худал' }]
        : [];
    try {
      const res = await fetch(`${apiUrl}/quizzes/questions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: newQText.trim(), type: newQType, optionsJson,
          correctAnswer: newQCorrect, explanation: newQExplanation.trim() || undefined,
          points: newQPoints, courseId,
        }),
      });
      if (!res.ok) throw new Error();
      setNewQText(''); setNewQCorrect('А'); setNewQExplanation('');
      setShowAddQuestion(false);
      fetchQuestions();
      showToast('Асуулт нэмэгдлээ');
    } catch {
      showToast('Асуулт нэмэхэд алдаа гарлаа', 'error');
    } finally {
      setAddingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (qId: string) => {
    if (!confirm('Асуулт устгах уу?')) return;
    const token = getToken();
    const res = await fetch(`${apiUrl}/quizzes/questions/${qId}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) { fetchQuestions(); showToast('Асуулт устгагдлаа'); }
    else showToast('Устгахад алдаа гарлаа', 'error');
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion) return;
    const token = getToken();
    const res = await fetch(`${apiUrl}/quizzes/questions/${editingQuestion.id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: editQText, correctAnswer: editQCorrect }),
    });
    if (res.ok) { setEditingQuestion(null); fetchQuestions(); showToast('Асуулт шинэчлэгдлээ'); }
    else showToast('Шинэчлэхэд алдаа гарлаа', 'error');
  };

  // ─── Quiz Creation Handler ─────────────────────────────────────────────────
  const handleCreateQuiz = async () => {
    if (!newQuizTitle.trim() || !newQuizLessonId || selectedQIds.size === 0) {
      showToast('Гарчиг, лекц болон хамгийн багадаа 1 асуулт сонгох шаардлагатай.', 'error');
      return;
    }
    const token = getToken();
    setCreatingQuiz(true);
    try {
      const res = await fetch(`${apiUrl}/quizzes`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newQuizTitle.trim(), timeLimitMin: newQuizTimeLimit,
          passScore: newQuizPassScore, lessonId: newQuizLessonId,
          questionIds: Array.from(selectedQIds),
        }),
      });
      if (!res.ok) throw new Error();
      setNewQuizTitle(''); setNewQuizLessonId(''); setSelectedQIds(new Set());
      setShowCreateQuiz(false);
      fetchCourse();
      showToast('Сорилт амжилттай үүслээ');
    } catch {
      showToast('Сорилт үүсгэхэд алдаа гарлаа', 'error');
    } finally {
      setCreatingQuiz(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Энэ сорилтыг устгах уу?')) return;
    const token = getToken();
    const res = await fetch(`${apiUrl}/quizzes/${quizId}`, {
      method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` },
    });
    if (res.ok) { fetchCourse(); showToast('Сорилт устгагдлаа'); }
    else showToast('Устгахад алдаа гарлаа', 'error');
  };

  const handleLoadQuizStats = async (quizId: string) => {
    setQuizStatsId(quizId);
    setQuizStatsLoading(true);
    const token = getToken();
    try {
      const res = await fetch(`${apiUrl}/quizzes/${quizId}/attempts`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) setQuizStats(await res.json());
    } catch {}
    setQuizStatsLoading(false);
  };

  // ─── Live Session Handlers ──────────────────────────────────────────────────
  const handleCreateLiveSession = async () => {
    if (!liveTitle.trim()) return;
    const token = getToken();
    setCreatingLive(true);
    try {
      const res = await fetch(`${apiUrl}/live-sessions`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: liveTitle.trim(),
          courseId,
          scheduledAt: liveScheduledAt || undefined,
        }),
      });
      if (!res.ok) throw new Error('Үүсгэхэд алдаа гарлаа');
      setLiveTitle('');
      setLiveScheduledAt('');
      setShowCreateLive(false);
      fetchLiveSessions();
      showToast('Live хичээл амжилттай бүртгэгдлээ');
    } catch (err: any) {
      showToast(err.message || 'Алдаа гарлаа', 'error');
    } finally {
      setCreatingLive(false);
    }
  };

  const handleStartLiveSession = async (sessionId: string) => {
    const token = getToken();
    try {
      const res = await fetch(`${apiUrl}/live-sessions/${sessionId}/start`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Эхлүүлэхэд алдаа гарлаа');
      fetchLiveSessions();
      showToast('Live хичээл эхэллээ. PIN код ашиглан оюутнууд нэвтрэх боломжтой');
    } catch (err: any) {
      showToast(err.message || 'Алдаа гарлаа', 'error');
    }
  };

  const handleEndLiveSession = async (sessionId: string) => {
    if (!confirm('Энэ live хичээлийг дуусгах уу?')) return;
    const token = getToken();
    try {
      const res = await fetch(`${apiUrl}/live-sessions/${sessionId}/end`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Дуусгахад алдаа гарлаа');
      fetchLiveSessions();
      showToast('Live хичээл амжилттай дууслаа');
    } catch (err: any) {
      showToast(err.message || 'Алдаа гарлаа', 'error');
    }
  };

  const handleDeleteLiveSession = async (sessionId: string) => {
    if (!confirm('Энэ live хичээлийг устгах уу?')) return;
    const token = getToken();
    try {
      const res = await fetch(`${apiUrl}/live-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Устгахад алдаа гарлаа');
      fetchLiveSessions();
      showToast('Live хичээл устгагдлаа');
    } catch (err: any) {
      showToast(err.message || 'Алдаа гарлаа', 'error');
    }
  };

  // ─── Schedule Data ──────────────────────────────────────────────────────────
  const getAllAssignmentsAndQuizzes = () => {
    if (!course) return [];
    const items: { title: string; type: string; date: string; lessonTitle: string }[] = [];
    course.modules.forEach(mod => {
      mod.lessons.forEach(lesson => {
        (lesson.quizzes || []).forEach(q => {
          items.push({ title: q.title, type: 'quiz', date: new Date().toISOString().split('T')[0], lessonTitle: lesson.title });
        });
        (lesson.assignments || []).forEach(a => {
          items.push({ title: a.title, type: 'assignment', date: a.dueDate?.split('T')[0] || '', lessonTitle: lesson.title });
        });
      });
    });
    // Add live sessions to schedule
    liveSessions.forEach(session => {
      items.push({
        title: session.title,
        type: 'live',
        date: session.scheduledAt ? session.scheduledAt.split('T')[0] : new Date(session.createdAt).toISOString().split('T')[0],
        lessonTitle: 'Live уулзалт',
      });
    });
    return items;
  };

  // ─── UI Helpers ────────────────────────────────────────────────────────────
  const TAB_CONFIG = [
    { id: 'content',   label: 'Хичээлийн агуулга', icon: BookOpen },
    { id: 'media',     label: 'Медиа файлууд',      icon: Paperclip },
    { id: 'questions', label: 'Асуулт банк',         icon: Database },
    { id: 'quizzes',   label: 'Сорилт',              icon: ClipboardList },
    { id: 'schedule',  label: 'Хуваарь',             icon: Calendar },
    { id: 'live',      label: 'Live хичээл',          icon: Radio },
  ] as const;

  const QUESTION_TYPE_LABEL: Record<string, string> = {
    MULTIPLE_CHOICE: 'Олон сонголт',
    TRUE_FALSE: 'Үнэн / Худал',
    SHORT_ANSWER: 'Богино хариулт',
  };

  // ─── Loading & Error States ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500">Ачаалж байна...</span>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-6 text-center text-rose-600 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
        Алдаа: {error || 'Курс олдсонгүй'}
      </div>
    );
  }

  const scheduleItems = getAllAssignmentsAndQuizzes();
  const allLessons = course.modules.flatMap(m => m.lessons);

  // ─── JSX ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <Link href="/teacher" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20">
                {course.code}
              </span>
              {course.isCBT && (
                <span className="text-[8px] font-extrabold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                  CBT курс
                </span>
              )}
            </div>
            <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight mt-0.5">
              {course.title}
            </h2>
          </div>
        </div>
        {mainTab === 'content' && activeLesson && (
          <button
            onClick={handleSaveContent}
            className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-orange-500/10 flex items-center gap-2 transition-all"
          >
            {saveSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saveSuccess ? 'ХАДГАЛАГДЛАА' : 'ХАДГАЛАХ'}</span>
          </button>
        )}
      </div>

      {/* ── Main Tabs ── */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-2xl w-full overflow-x-auto">
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setMainTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              mainTab === id
                ? 'bg-white dark:bg-slate-900 text-orange-500 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 1: ХИЧЭЭЛИЙН АГУУЛГА                                             */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left: Module / Lesson Tree */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3 h-[calc(100vh-280px)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-orange-500" />
                Агуулга
              </h3>
              <button
                onClick={() => setShowAddModule(v => !v)}
                className="text-[10px] font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Модуль
              </button>
            </div>

            {/* Add Module Form */}
            {showAddModule && (
              <div className="flex gap-2 p-3 bg-orange-50 dark:bg-orange-950/20 rounded-xl border border-orange-200 dark:border-orange-900">
                <input
                  value={newModuleTitle}
                  onChange={e => setNewModuleTitle(e.target.value)}
                  placeholder="Модулийн гарчиг..."
                  className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg focus:outline-none"
                />
                <button
                  onClick={handleAddModule}
                  disabled={addingModule}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-[10px] font-bold px-3 rounded-lg"
                >
                  {addingModule ? '...' : 'Нэмэх'}
                </button>
              </div>
            )}

            {/* Modules Tree */}
            <div className="space-y-3">
              {course.modules.length === 0 && (
                <p className="text-[11px] text-slate-400 text-center py-6">Модуль байхгүй байна</p>
              )}
              {course.modules.map((mod, mIdx) => {
                const isExpanded = expandedModules.has(mod.id);
                return (
                  <div key={mod.id} className="space-y-1">
                    <div className="flex items-center justify-between group">
                      <button
                        onClick={() => setExpandedModules(prev => {
                          const next = new Set(prev);
                          isExpanded ? next.delete(mod.id) : next.add(mod.id);
                          return next;
                        })}
                        className="flex items-center gap-1.5 flex-1 text-left"
                      >
                        {isExpanded ? <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />}
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest truncate">
                          {mIdx + 1}. {mod.title}
                        </span>
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setShowAddLesson(showAddLesson === mod.id ? null : mod.id)}
                          className="text-emerald-500 hover:text-emerald-600 p-1"
                          title="Лекц нэмэх"
                        >
                          <PlusCircle className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(mod.id)}
                          className="text-rose-400 hover:text-rose-500 p-1"
                          title="Устгах"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Add Lesson Form */}
                    {showAddLesson === mod.id && (
                      <div className="ml-4 p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900 space-y-2">
                        <input
                          value={newLessonTitle}
                          onChange={e => setNewLessonTitle(e.target.value)}
                          placeholder="Лекцийн гарчиг..."
                          className="w-full text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg focus:outline-none"
                        />
                        <select
                          value={newLessonType}
                          onChange={e => setNewLessonType(e.target.value)}
                          className="w-full text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg focus:outline-none"
                        >
                          <option value="MARKDOWN">Текст (Markdown)</option>
                          <option value="VIDEO_HLS">Видео (HLS)</option>
                          <option value="PDF">PDF файл</option>
                          <option value="QUIZ">Онлайн тест</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAddLesson(mod.id)}
                            disabled={addingLesson}
                            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold py-1.5 rounded-lg"
                          >
                            {addingLesson ? 'Нэмж байна...' : 'Нэмэх'}
                          </button>
                          <button
                            onClick={() => setShowAddLesson(null)}
                            className="px-3 text-slate-400 hover:text-slate-600 border border-slate-200 rounded-lg text-[10px]"
                          >
                            Болих
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lessons */}
                    {isExpanded && (
                      <div className="space-y-0.5 pl-4 border-l-2 border-slate-100 dark:border-slate-800 ml-1">
                        {mod.lessons.length === 0 && (
                          <p className="text-[10px] text-slate-400 italic py-1 pl-1">Лекц байхгүй</p>
                        )}
                        {mod.lessons.map(lesson => {
                          const isActive = activeLesson?.id === lesson.id;
                          const typeColors: Record<string, string> = {
                            MARKDOWN: 'text-blue-500',
                            VIDEO_HLS: 'text-violet-500',
                            PDF: 'text-rose-500',
                            QUIZ: 'text-amber-500',
                          };
                          return (
                            <div key={lesson.id} className="flex items-center justify-between group">
                              <button
                                onClick={() => handleLessonSelect(lesson)}
                                className={`flex-1 text-left p-2 rounded-lg text-xs flex items-center gap-2 transition-all ${
                                  isActive
                                    ? 'bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 font-bold'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                                }`}
                              >
                                <span className={`text-[8px] font-black uppercase shrink-0 ${typeColors[lesson.contentType] || 'text-slate-400'}`}>
                                  {lesson.contentType.replace('_HLS', '')}
                                </span>
                                <span className="truncate">{lesson.title}</span>
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="opacity-0 group-hover:opacity-100 text-rose-400 hover:text-rose-500 p-1.5 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Lesson Content Editor */}
          <div className="lg:col-span-2 h-[calc(100vh-280px)] overflow-y-auto space-y-4">
            {activeLesson ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
                {/* Lesson Meta */}
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Засварлаж байгаа лекц</span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">{activeLesson.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {(['markdown', 'video', 'pdf'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setContentEditorTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          contentEditorTab === tab
                            ? 'bg-orange-500 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {tab === 'markdown' ? 'Текст' : tab === 'video' ? 'Видео цоож' : 'PDF цоож'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Markdown Editor */}
                {contentEditorTab === 'markdown' && (
                  <div className="space-y-4">
                    <div className="flex items-start gap-2 p-3 bg-blue-50/60 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900 rounded-xl">
                      <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Маркдаун агуулгад <b>[!quiz-id]</b> тэмдэглэгээ ашиглан интерактив сорилыг шууд хичээлийн текстэд оруулж болно.
                      </p>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Лекцийн маркдаун бичвэр</label>
                      
                      {/* Toolbar */}
                      <div className="flex flex-wrap items-center gap-1 p-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-2xl">
                        {/* Bold */}
                        <button
                          type="button"
                          onClick={() => insertMarkdown('**', '**')}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
                          title="Bold (Болд)"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Italic */}
                        <button
                          type="button"
                          onClick={() => insertMarkdown('*', '*')}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
                          title="Italic (Налуу)"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Link */}
                        <button
                          type="button"
                          onClick={() => insertMarkdown('[холбоосны нэр](', ')') }
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
                          title="Link (Холбоос)"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        
                        {/* Image */}
                        <button
                          type="button"
                          onClick={() => insertMarkdown('![зургийн тайлбар](', ')') }
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
                          title="Image (Зураг)"
                        >
                          <LucideImage className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />

                        {/* Formula (KaTeX inline) */}
                        <button
                          type="button"
                          onClick={() => insertMarkdown('$', '$')}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
                          title="KaTeX Math Inline (Томьёо)"
                        >
                          <Sigma className="w-3.5 h-3.5" />
                        </button>

                        {/* Diagram (Mermaid) */}
                        <button
                          type="button"
                          onClick={() => insertMarkdown("\n```mermaid\ngraph TD\n  A --> B\n```\n")}
                          className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-300 transition-colors"
                          title="Mermaid Diagram (Диаграм)"
                        >
                          <GitFork className="w-3.5 h-3.5" />
                        </button>

                        <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />

                        {/* Flashcard */}
                        <button
                          type="button"
                          onClick={() => insertMarkdown('<flashcard front="Асуулт" back="Хариулт"></flashcard>')}
                          className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-[9px] font-bold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1"
                          title="Flashcard (Карт)"
                        >
                          <Layers className="w-3 h-3 text-violet-500" />
                          <span>Карт</span>
                        </button>

                        {/* Checkpoint */}
                        <button
                          type="button"
                          onClick={() => insertMarkdown('<checkpoint question="Асуулт?" options="Сонголт 1, Сонголт 2, Сонголт 3" answer="Сонголт 1"></checkpoint>')}
                          className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-[9px] font-bold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1"
                          title="Checkpoint (Асуулт)"
                        >
                          <HelpCircle className="w-3 h-3 text-emerald-500" />
                          <span>Асуулт</span>
                        </button>

                        {/* Blueprint */}
                        <button
                          type="button"
                          onClick={() => insertMarkdown('<blueprint title="Гарчиг" imageUrl="https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80&w=800" downloadUrl="https://images.unsplash.com/photo-1581092335397-9583fe92d232?q=80"></blueprint>')}
                          className="px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-[9px] font-bold text-slate-600 dark:text-slate-300 transition-colors flex items-center gap-1"
                          title="Blueprint (Зураг төсөл)"
                        >
                          <Compass className="w-3 h-3 text-blue-500" />
                          <span>Зураг төсөл</span>
                        </button>

                        <div className="flex-1" />

                        {/* Preview button */}
                        <button
                          type="button"
                          onClick={() => setPreviewMode(true)}
                          className="px-2 py-1 bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-950/40 rounded text-[9px] font-bold flex items-center gap-1 transition-all"
                          title="Preview (Харах)"
                        >
                          <Eye className="w-3 h-3" />
                          <span>ХАРАХ</span>
                        </button>
                      </div>

                      <textarea
                        ref={textareaRef}
                        value={markdownContent}
                        onChange={e => setMarkdownContent(e.target.value)}
                        placeholder="## Хичээлийн гарчиг&#10;&#10;Маркдаун агуулгаа энд бичнэ үү...&#10;&#10;$E = mc^2$ — KaTeX математик томьёо&#10;&#10;```javascript&#10;console.log('Код блок');&#10;```"
                        className="w-full h-72 p-4 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-b-2xl rounded-t-none border-t-0 focus:outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 dark:text-slate-100"
                      />
                    </div>
                  </div>
                )}

                {/* Video Locks */}
                {contentEditorTab === 'video' && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-2 p-3 bg-violet-50/60 dark:bg-violet-950/10 border border-violet-100 dark:border-violet-900 rounded-xl">
                      <Video className="w-4 h-4 text-violet-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        Видеоны тодорхой секунд дээр сорил байршуулан тоглуулагчийг зогсоох цоож тохируулна. Сурагч сорилоо амжилттай дуусгасны дараа үргэлжлүүлэн үзнэ.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">Видеоны шууд холбоос (URL)</label>
                      <input
                        value={videoUrlInput}
                        onChange={e => setVideoUrlInput(e.target.value)}
                        placeholder="Жишээ: http://localhost:5000/api/media/stream/...m3u8"
                        className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Зогсох хугацаа (сек)</label>
                        <input
                          type="number"
                          value={videoTimestamp}
                          onChange={e => setVideoTimestamp(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none"
                          placeholder="90"
                        />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Холбох сорил ID</label>
                        <input
                          type="text"
                          value={videoLockQuizId}
                          onChange={e => setVideoLockQuizId(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none"
                          placeholder="quiz-id"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={handleAddVideoLock}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-4 h-4 text-orange-400" />
                          Нэмэх
                        </button>
                      </div>
                    </div>
                    {videoLocks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">Одоогоор видеод цоож тохируулаагүй</p>
                    ) : (
                      videoLocks.map(lock => (
                        <div key={lock.timestamp} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                          <span className="font-bold text-orange-500">{lock.timestamp} сек</span>
                          <span className="text-slate-500">Сорил: {lock.quizId}</span>
                          <button onClick={() => setVideoLocks(v => v.filter(l => l.timestamp !== lock.timestamp))} className="text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {/* PDF Locks */}
                {contentEditorTab === 'pdf' && (
                  <div className="space-y-5">
                    <div className="flex items-start gap-2 p-3 bg-rose-50/60 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900 rounded-xl">
                      <FileText className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-600 dark:text-slate-400">
                        PDF материалын тодорхой хуудасны дугаарт хүрмэгц уншигчийг зогсоон сорилыг шийдвэрлүүлэх цоож тохируулна.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">PDF файлын шууд холбоос (URL)</label>
                      <input
                        value={pdfUrlInput}
                        onChange={e => setPdfUrlInput(e.target.value)}
                        placeholder="Жишээ: http://localhost:5000/api/media/view/...pdf"
                        className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/50 dark:border-slate-800">
                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Цоожлох хуудас</label>
                        <input
                          type="number"
                          value={pdfPage}
                          onChange={e => setPdfPage(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none"
                          placeholder="5"
                        />
                      </div>
                      <div className="space-y-1 col-span-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase block">Холбох сорил ID</label>
                        <input
                          type="text"
                          value={pdfLockQuizId}
                          onChange={e => setPdfLockQuizId(e.target.value)}
                          className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none"
                          placeholder="quiz-id"
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={handleAddPdfLock}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1.5"
                        >
                          <Plus className="w-4 h-4 text-orange-400" />
                          Нэмэх
                        </button>
                      </div>
                    </div>
                    {pdfLocks.length === 0 ? (
                      <p className="text-xs text-slate-400 italic text-center py-4">Одоогоор PDF-д цоож тохируулаагүй</p>
                    ) : (
                      pdfLocks.map(lock => (
                        <div key={lock.lockPage} className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs">
                          <span className="font-bold text-rose-500">{lock.lockPage}-р хуудас</span>
                          <span className="text-slate-500">Сорил: {lock.quizId}</span>
                          <button onClick={() => setPdfLocks(v => v.filter(l => l.lockPage !== lock.lockPage))} className="text-rose-500 p-1.5 hover:bg-rose-50 rounded-lg">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-16 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-slate-400 h-full flex flex-col items-center justify-center">
                <Layout className="w-14 h-14 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Лекц сонгоно уу</p>
                <p className="text-[11px] text-slate-400 mt-1">Зүүн талаас засах лекцээ сонгоно уу.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2: АСУУЛТЫН БАНК                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'questions' && (
        <div className="space-y-5">
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Асуултын банк</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">{questions.length} асуулт • {course.title}</p>
            </div>
            <button
              onClick={() => setShowAddQuestion(v => !v)}
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
            >
              {showAddQuestion ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showAddQuestion ? 'Болих' : 'Шинэ асуулт нэмэх'}
            </button>
          </div>

          {/* Add Question Form */}
          {showAddQuestion && (
            <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900 rounded-3xl p-6 shadow-sm space-y-5">
              <h4 className="text-xs font-black text-orange-500 uppercase tracking-wider">Шинэ асуулт нэмэх</h4>

              {/* Question Type */}
              <div className="flex gap-2">
                {(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER'] as const).map(type => (
                  <button
                    key={type}
                    onClick={() => setNewQType(type)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-bold uppercase transition-all ${
                      newQType === type
                        ? 'bg-orange-500 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {QUESTION_TYPE_LABEL[type]}
                  </button>
                ))}
              </div>

              {/* Question Text */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Асуултын агуулга *</label>
                <textarea
                  value={newQText}
                  onChange={e => setNewQText(e.target.value)}
                  placeholder="Асуулт бичнэ үү... (Markdown болон $KaTeX$ дэмжинэ)"
                  className="w-full h-24 p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              {/* Options (MCQ only) */}
              {newQType === 'MULTIPLE_CHOICE' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Сонголтууд</label>
                  <div className="grid grid-cols-2 gap-3">
                    {newQOptions.map((opt, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 w-5 text-center">{String.fromCharCode(65 + i)}.</span>
                        <input
                          value={opt}
                          onChange={e => { const arr = [...newQOptions]; arr[i] = e.target.value; setNewQOptions(arr); }}
                          className="flex-1 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">Зөв хариулт</label>
                    <select
                      value={newQCorrect}
                      onChange={e => setNewQCorrect(e.target.value)}
                      className="text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none"
                    >
                      {newQOptions.map((opt, i) => (
                        <option key={i} value={opt}>{String.fromCharCode(65 + i)}. {opt}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* True/False correct */}
              {newQType === 'TRUE_FALSE' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Зөв хариулт</label>
                  <div className="flex gap-3">
                    {['Үнэн', 'Худал'].map(v => (
                      <button
                        key={v}
                        onClick={() => setNewQCorrect(v)}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${
                          newQCorrect === v ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Short Answer */}
              {newQType === 'SHORT_ANSWER' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Зөв хариулт</label>
                  <input
                    value={newQCorrect}
                    onChange={e => setNewQCorrect(e.target.value)}
                    placeholder="Зөв хариултыг оруулна уу..."
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>
              )}

              {/* Points + Explanation */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Оноо (Points)</label>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={newQPoints}
                    onChange={e => setNewQPoints(Number(e.target.value))}
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Тайлбар (Explanation)</label>
                  <input
                    value={newQExplanation}
                    onChange={e => setNewQExplanation(e.target.value)}
                    placeholder="Зөв хариултын тайлбар..."
                    className="w-full text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowAddQuestion(false)} className="text-xs text-slate-500 hover:text-slate-700 px-4 py-2 border border-slate-200 rounded-xl">Болих</button>
                <button
                  onClick={handleAddQuestion}
                  disabled={addingQuestion || !newQText.trim()}
                  className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-2"
                >
                  {addingQuestion ? 'Нэмж байна...' : <><Plus className="w-4 h-4" />Асуулт нэмэх</>}
                </button>
              </div>
            </div>
          )}

          {/* Questions List */}
          {questionsLoading ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : questions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
              <HelpCircle className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Асуултын банк хоосон байна</p>
              <p className="text-[11px] text-slate-400 mt-1">Дээрх товчоор асуулт нэмэх боломжтой.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div key={q.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <span className="text-[9px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg shrink-0 mt-0.5">#{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{q.text}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                            q.type === 'MULTIPLE_CHOICE' ? 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400' :
                            q.type === 'TRUE_FALSE' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' :
                            'bg-amber-100 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400'
                          }`}>
                            {QUESTION_TYPE_LABEL[q.type]}
                          </span>
                          <span className="text-[9px] text-slate-400 flex items-center gap-1">
                            <Award className="w-3 h-3" />{q.points} оноо
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        onClick={() => { setEditingQuestion(q); setEditQText(q.text); setEditQCorrect(q.correctAnswer); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all"
                        title="Засах"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                        title="Устгах"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 3: СОРИЛТ ҮҮСГЭХ                                                */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'quizzes' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white">Сорилт үүсгэх</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Асуултын банкнаас асуулт сонгон сорилт бүрдүүлнэ</p>
            </div>
            <button
              onClick={() => setShowCreateQuiz(v => !v)}
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
            >
              {showCreateQuiz ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateQuiz ? 'Болих' : 'Шинэ сорилт үүсгэх'}
            </button>
          </div>

          {showCreateQuiz && (
            <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900 rounded-3xl p-6 shadow-sm space-y-5">
              <h4 className="text-xs font-black text-orange-500 uppercase tracking-wider">Шинэ сорилт</h4>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Сорилын гарчиг *</label>
                  <input
                    value={newQuizTitle}
                    onChange={e => setNewQuizTitle(e.target.value)}
                    placeholder="Жишээ: Чадамжийн нэгж 1-ийн тест"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block flex items-center gap-1"><Clock className="w-3 h-3" />Хугацаа (мин)</label>
                  <input
                    type="number"
                    value={newQuizTimeLimit}
                    onChange={e => setNewQuizTimeLimit(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block flex items-center gap-1"><Target className="w-3 h-3" />Босго оноо (%)</label>
                  <input
                    type="number"
                    value={newQuizPassScore}
                    onChange={e => setNewQuizPassScore(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Холбох лекц *</label>
                  <select
                    value={newQuizLessonId}
                    onChange={e => setNewQuizLessonId(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none"
                  >
                    <option value="">— Лекц сонгох —</option>
                    {allLessons.map(l => (
                      <option key={l.id} value={l.id}>{l.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Question Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">
                    Асуулт сонгох ({selectedQIds.size} / {questions.length})
                  </label>
                  <select
                    value={filterQuestionType}
                    onChange={e => setFilterQuestionType(e.target.value)}
                    className="text-[9px] bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 px-2 py-1 rounded-lg text-slate-600 dark:text-slate-350 focus:outline-none"
                  >
                    <option value="ALL">Бүх асуулт</option>
                    <option value="MULTIPLE_CHOICE">Олон сонголттой</option>
                    <option value="TRUE_FALSE">Зөв/Буруу</option>
                    <option value="SHORT_ANSWER">Богино хариулт</option>
                    <option value="MATCHING">Тохируулах</option>
                  </select>
                </div>
                {questions.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">Асуултын банк хоосон байна. Эхлээд асуулт нэмнэ үү.</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50 dark:bg-slate-950">
                    {questions
                      .filter(q => filterQuestionType === 'ALL' || q.type === filterQuestionType)
                      .map(q => (
                        <label
                          key={q.id}
                          className="flex items-start gap-3 cursor-pointer p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-900 transition-colors group"
                        >
                          <input
                            type="checkbox"
                            checked={selectedQIds.has(q.id)}
                            onChange={e => {
                              const next = new Set(selectedQIds);
                              e.target.checked ? next.add(q.id) : next.delete(q.id);
                              setSelectedQIds(next);
                            }}
                            className="mt-0.5 accent-orange-500 shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{q.text}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[9px] font-bold text-slate-400">{QUESTION_TYPE_LABEL[q.type]}</span>
                              <span className="text-[9px] text-orange-500">{q.points} оноо</span>
                            </div>
                          </div>
                        </label>
                      ))}
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2">
                <div className="text-xs text-slate-500">
                  Нийт оноо: <b className="text-orange-500">
                    {questions.filter(q => selectedQIds.has(q.id)).reduce((sum, q) => sum + q.points, 0)} оноо
                  </b>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowCreateQuiz(false)} className="text-xs text-slate-500 px-4 py-2 border border-slate-200 rounded-xl">Болих</button>
                  <button
                    onClick={handleCreateQuiz}
                    disabled={creatingQuiz || !newQuizTitle.trim() || !newQuizLessonId || selectedQIds.size === 0}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-2"
                  >
                    {creatingQuiz ? 'Үүсгэж байна...' : <><Check className="w-4 h-4" />Сорилт үүсгэх</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Existing Quizzes per Lesson */}
          <div className="space-y-4">
            {course.modules.flatMap(mod => mod.lessons).filter(l => (l.quizzes?.length ?? 0) > 0).length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                <ClipboardList className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Одоогоор сорилт байхгүй байна</p>
                <p className="text-[11px] text-slate-400 mt-1">Дээрх товчоор шинэ сорилт үүсгэх боломжтой.</p>
              </div>
            ) : (
              allLessons.filter(l => (l.quizzes?.length ?? 0) > 0).map(lesson => (
                <div key={lesson.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-orange-500 shrink-0" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{lesson.title}</span>
                  </div>
                  {(lesson.quizzes || []).map(quiz => (
                    <div key={quiz.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{quiz.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{quiz.timeLimitMin} мин</span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1"><Target className="w-3 h-3" />{quiz.passScore}% босго</span>
                          <span className="text-[10px] text-orange-500 flex items-center gap-1"><HelpCircle className="w-3 h-3" />{quiz.quizQuestions?.length ?? 0} асуулт</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleLoadQuizStats(quiz.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20 transition-all"
                          title="Тайлан / Статистик"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuiz(quiz.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                          title="Устгах"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 2b: МЕДИА ФАЙЛУУД                                               */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'media' && (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Медиа файл байршуулах</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Зураг, PDF, аудио, видео болон Markdown файлуудыг MinIO-д байршуулж, лекцтэй холбох
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload panel */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-orange-500" />
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                  Шинэ файл байршуулах
                </h4>
              </div>

              {/* Lesson selector for linking */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">
                  Лекцтэй холбох (заавал биш)
                </label>
                <select
                  id="media-lesson-select"
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none"
                  defaultValue=""
                  onChange={e => {
                    (window as any).__mediaLessonId = e.target.value || undefined;
                  }}
                >
                  <option value="">— Лекцгүй (курс түвшинд байршуулах) —</option>
                  {course.modules.flatMap(m => m.lessons).map(l => (
                    <option key={l.id} value={l.id}>{l.title}</option>
                  ))}
                </select>
              </div>

              <MediaUploader
                courseId={courseId}
                lessonId={undefined}
                multiple
                label="Файл байршуулах (чирж тавих эсвэл дарна уу)"
                onUpload={(file) => {
                  // Байршуулсны дараа жагсаалтыг дахин татна
                  window.dispatchEvent(new CustomEvent('media-uploaded'));
                }}
              />

              {/* File type guide */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Зураг',    ext: 'jpg / png / webp / gif',  limit: '10 MB',  color: 'blue'   },
                  { label: 'PDF',      ext: 'pdf',                      limit: '20 MB',  color: 'rose'   },
                  { label: 'Аудио',    ext: 'mp3 / wav / ogg / aac',   limit: '50 MB',  color: 'violet' },
                  { label: 'Видео',    ext: 'mp4 / mov / mkv / webm',  limit: '500 MB', color: 'amber'  },
                  { label: 'Markdown', ext: 'md / txt',                 limit: '2 MB',   color: 'emerald'},
                ].map(item => (
                  <div key={item.label} className="p-2.5 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{item.label}</p>
                    <p className="text-[9px] text-slate-400 font-mono mt-0.5">{item.ext}</p>
                    <p className="text-[9px] text-orange-500 font-bold mt-0.5">≤ {item.limit}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Course media summary panel */}
            <CourseMediaList courseId={courseId} apiUrl={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'} />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 4: ХУВААРЬ & КАЛЕНДАРЬ                                          */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'schedule' && (
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Шалгалт & Даалгаврын хуваарь</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Сорилт болон бие даалтуудын дуусах хугацааны цагийн шугам</p>
          </div>

          {scheduleItems.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
              <Calendar className="w-14 h-14 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Хуваарь хоосон байна</p>
              <p className="text-[11px] text-slate-400 mt-2 max-w-xs mx-auto">
                Хичээлүүдтэй холбогдсон сорилт болон даалгаварууд байхгүй байна.
                Эхлээд сорилт эсвэл даалгавар үүсгэнэ үү.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Timeline */}
              {scheduleItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.type === 'quiz'
                      ? 'bg-orange-100 dark:bg-orange-950/30 text-orange-600'
                      : item.type === 'live'
                        ? 'bg-red-100 dark:bg-red-950/30 text-red-600'
                        : 'bg-blue-100 dark:bg-blue-950/30 text-blue-600'
                  }`}>
                    {item.type === 'quiz' ? <ClipboardList className="w-5 h-5" /> : item.type === 'live' ? <Radio className="w-5 h-5 text-red-500 animate-pulse" /> : <FileText className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{item.type === 'live' ? '' : 'Лекц: '}{item.lessonTitle}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${
                      item.type === 'quiz'
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-950/30 dark:text-orange-400'
                        : item.type === 'live'
                          ? 'bg-red-500/10 text-red-500 border border-red-500/20'
                          : 'bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                    }`}>
                      {item.type === 'quiz' ? 'Сорилт' : item.type === 'live' ? 'Live хичээл' : 'Даалгавар'}
                    </span>
                    {item.date && (
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />{item.date}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* TAB 5: LIVE ХИЧЭЭЛҮҮД                                                 */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {mainTab === 'live' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                Live хичээлүүд
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Оюутнуудтайгаа бодит цагт холбогдож, санал асуулга явуулах урсгал</p>
            </div>
            <button
              onClick={() => setShowCreateLive(v => !v)}
              className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all"
            >
              {showCreateLive ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateLive ? 'Болих' : 'Live хичээл үүсгэх'}
            </button>
          </div>

          {/* Create Live Session Form */}
          {showCreateLive && (
            <div className="bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-950 rounded-3xl p-6 shadow-sm space-y-4 max-w-xl">
              <h4 className="text-xs font-black text-orange-500 uppercase tracking-wider">Шинэ live хичээл төлөвлөх</h4>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Хичээлийн гарчиг *</label>
                  <input
                    value={liveTitle}
                    onChange={e => setLiveTitle(e.target.value)}
                    placeholder="Жишээ: Цахилгааны аюулгүй ажиллагаа - Бодит дадлага"
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Төлөвлөсөн цаг (заавал биш)</label>
                  <input
                    type="datetime-local"
                    value={liveScheduledAt}
                    onChange={e => setLiveScheduledAt(e.target.value)}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-800 dark:text-slate-200"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button onClick={() => setShowCreateLive(false)} className="text-xs text-slate-500 px-4 py-2 border border-slate-200 rounded-xl">Болих</button>
                  <button
                    onClick={handleCreateLiveSession}
                    disabled={creatingLive || !liveTitle.trim()}
                    className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white text-xs font-bold px-5 py-2 rounded-xl flex items-center gap-1.5"
                  >
                    {creatingLive ? 'Үүсгэж байна...' : <><Check className="w-4 h-4" />Live хичээл нэмэх</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Sessions List */}
          {liveSessionsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
          ) : liveSessions.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
              <Radio className="w-12 h-12 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Live хичээл одоогоор байхгүй байна</p>
              <p className="text-[11px] text-slate-400 mt-1">Оюутнуудтайгаа шууд холбогдож хичээллэхийг хүсвэл шинээр үүсгээрэй.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {liveSessions.map((session) => (
                <div key={session.id} className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 font-mono tracking-widest">
                        PIN: {session.sessionCode}
                      </span>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${
                        session.status === 'LIVE' ? 'bg-red-500/10 text-red-500 border-red-500/20 animate-pulse' :
                        session.status === 'ENDED' ? 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800' :
                        'bg-blue-500/10 text-blue-500 border-blue-500/20'
                      }`}>
                        {session.status === 'LIVE' ? 'Явж байна' :
                         session.status === 'ENDED' ? 'Дууссан' : 'Төлөвлөсөн'}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-2.5 leading-snug">{session.title}</h4>
                    
                    <div className="space-y-1.5 mt-3 text-[10px] text-slate-400">
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
                      {session.endedAt && (
                        <p className="flex items-center gap-1.5">
                          <X className="w-3.5 h-3.5 text-slate-400" />
                          Дууссан: {new Date(session.endedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-3">
                    {session.status === 'SCHEDULED' && (
                      <>
                        <button
                          onClick={() => handleStartLiveSession(session.id)}
                          className="flex-1 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[11px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Эхлүүлэх
                        </button>
                        <button
                          onClick={() => handleDeleteLiveSession(session.id)}
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
                          className="flex-1 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white text-[11px] font-bold py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-orange-500/10"
                        >
                          <Radio className="w-3.5 h-3.5" />
                          Удирдах цонх руу орох
                        </Link>
                        <button
                          onClick={() => handleEndLiveSession(session.id)}
                          className="px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold py-2 rounded-xl transition-all border border-slate-200 dark:border-slate-700"
                        >
                          Дуусгах
                        </button>
                      </>
                    )}

                    {session.status === 'ENDED' && (
                      <div className="w-full text-center py-1 text-[10px] text-slate-400 italic">
                        Хичээл амжилттай хаагдсан байна.
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Edit Question ── */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Асуулт засварлах</h4>
              <button onClick={() => setEditingQuestion(null)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>
            
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Асуултын текст</label>
                <textarea
                  value={editQText}
                  onChange={e => setEditQText(e.target.value)}
                  className="w-full h-24 p-3 font-mono text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase block">Зөв хариултын утга</label>
                <input
                  value={editQCorrect}
                  onChange={e => setEditQCorrect(e.target.value)}
                  className="w-full text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button onClick={() => setEditingQuestion(null)} className="text-xs text-slate-500 px-4 py-2 border border-slate-200 rounded-xl">Болих</button>
                <button onClick={handleUpdateQuestion} className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-5 py-2 rounded-xl">Хадгалах</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Quiz Attempts Stats ── */}
      {quizStatsId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-orange-500" />
                Сорилын гүйцэтгэлийн статистик
              </h4>
              <button onClick={() => { setQuizStatsId(null); setQuizStats(null); }} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-4 h-4" /></button>
            </div>

            {quizStatsLoading ? (
              <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 text-orange-500 animate-spin" /></div>
            ) : !quizStats ? (
              <p className="text-xs text-slate-400 italic text-center py-8">Статистик мэдээлэл татахад алдаа гарлаа.</p>
            ) : (
              <div className="space-y-6">
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Нийт оролдлого', val: quizStats.totalAttempts },
                    { label: 'Тэнцсэн',        val: quizStats.passedCount, color: 'text-emerald-500' },
                    { label: 'Хараахан тэнцээгүй', val: quizStats.failedCount, color: 'text-rose-500' },
                    { label: 'Тэнцэлтийн хувь', val: `${quizStats.passRate}%`, color: 'text-orange-500' },
                  ].map(card => (
                    <div key={card.label} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl text-center">
                      <p className="text-[9px] text-slate-400 font-bold uppercase">{card.label}</p>
                      <p className={`text-base font-black mt-1 ${card.color || 'text-slate-800 dark:text-slate-200'}`}>{card.val}</p>
                    </div>
                  ))}
                </div>

                {/* Attempts Table */}
                <div className="space-y-2">
                  <h5 className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Сурагчдын дүнгийн түүх</h5>
                  <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden">
                    <table className="w-full text-[11px] text-left">
                      <thead className="bg-slate-50 dark:bg-slate-950 text-slate-400 uppercase text-[9px] border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="px-4 py-2.5">Код</th>
                          <th className="px-4 py-2.5">Оюутан</th>
                          <th className="px-4 py-2.5 text-center">Оноо</th>
                          <th className="px-4 py-2.5 text-center">Төлөв</th>
                          <th className="px-4 py-2.5 text-right">Хугацаа</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {quizStats.attempts.length === 0 ? (
                          <tr><td colSpan={5} className="text-center py-6 text-slate-400 italic">Оролдлого хийсэн оюутан байхгүй байна.</td></tr>
                        ) : (
                          quizStats.attempts.map((attempt: any) => (
                            <tr key={attempt.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                              <td className="px-4 py-2.5 font-mono text-[10px]">{attempt.student?.code}</td>
                              <td className="px-4 py-2.5 font-bold text-slate-700 dark:text-slate-300">{attempt.student?.fullName}</td>
                              <td className="px-4 py-2.5 text-center font-black text-orange-500">{attempt.score}</td>
                              <td className="px-4 py-2.5 text-center">
                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                  attempt.passed
                                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                                    : 'bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                                }`}>
                                  {attempt.passed ? 'ТЭНЦСЭН' : 'ҮГҮЙ'}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-right text-slate-400 text-[10px]">{attempt.completedAt ? new Date(attempt.completedAt).toLocaleString() : ''}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Markdown Preview ── */}
      {previewMode && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-4xl max-h-[85vh] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-orange-500" />
                <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Хичээлийн агуулгыг урьдчилан харах (Preview)
                </h4>
              </div>
              <button
                onClick={() => setPreviewMode(false)}
                className="p-1 hover:bg-slate-150 dark:hover:bg-slate-800 rounded-lg text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-6 px-1 space-y-4">
              <div className="max-w-3xl mx-auto bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 p-6 md:p-8 rounded-2xl shadow-sm min-h-[300px]">
                {activeLesson && (
                  <div className="space-y-1 mb-6 border-b border-slate-100 dark:border-slate-850 pb-4">
                    <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                      Чадамжийн элемент {activeLesson.order}
                    </span>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                      {activeLesson.title}
                    </h2>
                  </div>
                )}
                {markdownContent ? (
                  <MarkdownRenderer content={markdownContent} />
                ) : (
                  <p className="text-xs text-slate-400 text-center py-12">Одоогоор агуулга байхгүй байна.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <button
                onClick={() => setPreviewMode(false)}
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-orange-500/10 active:scale-95 transition-all"
              >
                Хаах
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Toast Overlay ── */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-bounce">
          <div className={`px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 border text-xs font-bold ${
            toast.type === 'success'
              ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-500/10'
              : 'bg-rose-500 border-rose-600 text-white shadow-rose-500/10'
          }`}>
            {toast.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <ShieldAlert className="w-4 h-4 shrink-0" />}
            <span>{toast.msg}</span>
          </div>
        </div>
      )}

    </div>
  );
}

// ─── CourseMediaList: Курсийн байршуулсан файлуудын жагсаалт ─────────────────
function CourseMediaList({ courseId, apiUrl }: { courseId: string; apiUrl: string }) {
  const [data, setData]     = React.useState<any>(null);
  const [loading, setLoad]  = React.useState(true);
  const [copied, setCopied] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoad(true);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    try {
      const res = await fetch(`${apiUrl}/media/course/${courseId}/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setData(await res.json());
    } catch {}
    setLoad(false);
  }, [courseId, apiUrl]);

  React.useEffect(() => {
    load();
    window.addEventListener('media-uploaded', load);
    return () => window.removeEventListener('media-uploaded', load);
  }, [load]);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const deleteAsset = async (id: string) => {
    if (!confirm('Энэ файлыг MinIO болон өгөгдлийн сангаас устгах уу?')) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${apiUrl}/media/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) load();
  };

  const TYPE_ICON: Record<string, string> = {
    IMAGE: '🖼️', PDF: '📄', AUDIO: '🎵', VIDEO_RAW: '🎬', VIDEO_HLS: '📺', MARKDOWN: '📝',
  };

  const formatBytes = (n: number) =>
    n < 1024 ? `${n}B` : n < 1024 * 1024 ? `${(n/1024).toFixed(1)}KB` : `${(n/1024/1024).toFixed(2)}MB`;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4 text-orange-500" />
          Курсийн медиа архив
        </h4>
        {data && (
          <span className="text-[10px] text-slate-400">
            {data.totalFiles} файл · {data.totalSizeMB} MB
          </span>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 text-orange-500 animate-spin" />
        </div>
      ) : !data || data.totalFiles === 0 ? (
        <div className="text-center py-12">
          <Paperclip className="w-10 h-10 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
          <p className="text-xs text-slate-400">Байршуулсан файл байхгүй байна</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
          {/* Type summary */}
          {Object.entries(data.byType as Record<string,number>).length > 0 && (
            <div className="flex flex-wrap gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
              {Object.entries(data.byType as Record<string,number>).map(([type, count]) => (
                <span key={type} className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-1 rounded-lg">
                  {TYPE_ICON[type] || '📁'} {type} · {count}
                </span>
              ))}
            </div>
          )}

          {/* Files list */}
          {data.assets.map((asset: any) => (
            <div key={asset.id} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors group">
              <span className="text-lg shrink-0">{TYPE_ICON[asset.type] || '📁'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 truncate">{asset.originalName}</p>
                <p className="text-[9px] text-slate-400 truncate">
                  {asset.lesson ? `Лекц: ${asset.lesson.title}` : 'Курс түвшин'} · {formatBytes(asset.sizeBytes)}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => copy(asset.publicUrl, asset.id)}
                  className={`p-1.5 rounded-lg text-[10px] transition-all ${
                    copied === asset.id
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400'
                      : 'text-slate-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/20'
                  }`}
                  title="URL хуулах"
                >
                  {copied === asset.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <a
                  href={asset.publicUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                  title="Нээх"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => deleteAsset(asset.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                  title="Устгах"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
