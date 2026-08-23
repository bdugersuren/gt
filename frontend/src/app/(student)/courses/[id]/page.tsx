'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useParams } from 'next/navigation';
import {
  BookOpen, ArrowLeft, Play, Lock, CheckCircle, FileText, HelpCircle,
  Clock, Volume2, Maximize2, Settings, Globe, Award, Sparkles, Copy,
  Check, ChevronRight, ChevronDown, Menu, X, PlayCircle, PauseCircle,
  FileCode, Layers, RotateCcw
} from 'lucide-react';
import InteractiveQuizWidget from '../../../../components/InteractiveQuizWidget';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface Lesson {
  id: string;
  title: string;
  order: number;
  contentType: string;
  completed?: boolean;
  isLocked?: boolean;
  contentBody?: string;
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

export default function CourseDetailsPage() {
  const [course, setCourse] = useState<CourseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeModuleIndex, setActiveModuleIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [notesText, setNotesText] = useState('');

  // Grades and Chat tab states
  const [gradesData, setGradesData] = useState<any>(null);
  const [gradesLoading, setGradesLoading] = useState(false);
  const [chatContacts, setChatContacts] = useState<any[]>([]);
  const [activeContact, setActiveContact] = useState<any>(null);
  const [conversation, setConversation] = useState<any[]>([]);
  const [messageText, setMessageText] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Interactive content gating states
  const [completedQuizzes, setCompletedQuizzes] = useState<Set<string>>(new Set());
  const [videoTime, setVideoTime] = useState(0);
  const [videoLocked, setVideoLocked] = useState(false);
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfLocked, setPdfLocked] = useState(false);
  const [activeGatingConfig, setActiveGatingConfig] = useState<any>(null);

  const router = useRouter();
  const params = useParams();
  const courseId = params.id as string;

  useEffect(() => {
    if (activeLesson?.contentType === 'MARKDOWN' && activeTab === 'overview') {
      setActiveTab('grades');
    }
  }, [activeLesson, activeTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));

    const savedQuizzes = localStorage.getItem('completed_quizzes');
    if (savedQuizzes) {
      setCompletedQuizzes(new Set(JSON.parse(savedQuizzes)));
    }

    const fetchCourseDetails = async () => {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      try {
        const response = await fetch(`${apiUrl}/courses/${courseId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error('Хичээлийн мэдээллийг татахад алдаа гарлаа');
        }

        const data = await response.json();

        // Load completed lessons from localStorage
        let completedLessons = new Set<string>();
        const savedCompletions = localStorage.getItem('completed_lessons');
        if (savedCompletions) {
          completedLessons = new Set(JSON.parse(savedCompletions));
        }
        setCompletedSet(completedLessons);

        const enrichedModules = data.modules.map((mod: Module) => {
          const sortedLessons = [...mod.lessons].sort((a, b) => a.order - b.order);
          const enrichedLessons = sortedLessons.map((les, index) => {
            const completed = completedLessons.has(les.id);
            // First lesson is unlocked. Subsequent are unlocked if previous is completed.
            let isLocked = false;
            if (index > 0) {
              const prevLesson = sortedLessons[index - 1];
              isLocked = !completedLessons.has(prevLesson.id);
            }
            return {
              ...les,
              completed,
              isLocked,
            };
          });
          return {
            ...mod,
            lessons: enrichedLessons,
          };
        });

        const sortedModules = enrichedModules.sort((a: Module, b: Module) => a.order - b.order);

        setCourse({
          ...data,
          modules: sortedModules,
        });

        // Set active lesson
        let foundActive = false;
        for (let i = 0; i < sortedModules.length; i++) {
          const unlockedLesson = sortedModules[i].lessons.find((l: Lesson) => !l.isLocked && !l.completed);
          if (unlockedLesson) {
            setActiveLesson(unlockedLesson);
            setActiveModuleIndex(i);
            foundActive = true;
            break;
          }
        }
        if (!foundActive && sortedModules.length > 0 && sortedModules[0].lessons.length > 0) {
          setActiveLesson(sortedModules[0].lessons[0]);
          setActiveModuleIndex(0);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseDetails();
  }, [courseId]);

  // Load grades data
  const fetchGrades = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setGradesLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    try {
      const res = await fetch(`${apiUrl}/courses/${courseId}/student-grades`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'STUDENT',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setGradesData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setGradesLoading(false);
    }
  };

  // Load conversation
  const fetchConversation = async (contactId: string) => {
    const token = localStorage.getItem('token');
    if (!token) return;
    setChatLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    try {
      const res = await fetch(`${apiUrl}/messages/conversation/${contactId}?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'STUDENT',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setConversation(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setChatLoading(false);
    }
  };

  // Load chat contacts
  const fetchChatContacts = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    try {
      const res = await fetch(`${apiUrl}/messages/contacts?courseId=${courseId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'STUDENT',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setChatContacts(data);
        if (data.length > 0 && !activeContact) {
          setActiveContact(data[0]);
          fetchConversation(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !activeContact) return;
    const token = localStorage.getItem('token');
    if (!token) return;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    try {
      const res = await fetch(`${apiUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-active-role': 'STUDENT',
        },
        body: JSON.stringify({
          receiverId: activeContact.id,
          content: messageText,
          courseId,
        }),
      });
      if (res.ok) {
        const newMessage = await res.json();
        setConversation((prev) => [...prev, newMessage]);
        setMessageText('');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Trigger loading when tab changes
  useEffect(() => {
    if (activeTab === 'grades') {
      fetchGrades();
    } else if (activeTab === 'chat') {
      fetchChatContacts();
    }
  }, [activeTab]);

  // Load custom notes and gating config on active lesson change
  useEffect(() => {
    if (activeLesson) {
      const savedNotes = localStorage.getItem(`notes_${activeLesson.id}`);
      setNotesText(savedNotes || '');

      const savedGating = localStorage.getItem(`gating_${activeLesson.id}`);
      if (savedGating) {
        setActiveGatingConfig(JSON.parse(savedGating));
      } else {
        setActiveGatingConfig(null);
      }
    }
  }, [activeLesson]);

  const saveNotes = () => {
    if (activeLesson) {
      localStorage.setItem(`notes_${activeLesson.id}`, notesText);
      alert('Тэмдэглэл хадгалагдлаа!');
    }
  };

  const handleLessonSelect = (lesson: Lesson, modIdx: number) => {
    if (lesson.isLocked) return;
    setActiveLesson(lesson);
    setActiveModuleIndex(modIdx);
    setIsVideoPlaying(false);
    setVideoTime(0);
    setVideoLocked(false);
    setPdfPage(1);
    setPdfLocked(false);
    setSidebarOpen(false);
  };

  const handleQuizSuccess = (quizId: string) => {
    const newCompleted = new Set(completedQuizzes);
    newCompleted.add(quizId);
    setCompletedQuizzes(newCompleted);
    localStorage.setItem('completed_quizzes', JSON.stringify(Array.from(newCompleted)));

    // Dynamic video lock check
    const currentVideoLocks = activeGatingConfig?.videoLocks || [{ timestamp: 15, quizId: 'quiz-vid-1' }];
    if (currentVideoLocks.some((l: any) => l.quizId === quizId)) {
      setVideoLocked(false);
      setIsVideoPlaying(true);
    }

    // Dynamic PDF lock check
    const currentPdfLocks = activeGatingConfig?.pdfLocks || [{ lockPage: 5, quizId: 'quiz-pdf-1' }];
    const matchingPdfLock = currentPdfLocks.find((l: any) => l.quizId === quizId);
    if (matchingPdfLock) {
      setPdfLocked(false);
      setPdfPage(matchingPdfLock.lockPage);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const videoDuration = 120; // mock duration (2 minutes)

  useEffect(() => {
    if (!isVideoPlaying || videoLocked) return;
    const currentVideoLocks = activeGatingConfig?.videoLocks || [{ timestamp: 15, quizId: 'quiz-vid-1' }];

    const interval = setInterval(() => {
      setVideoTime((prev) => {
        const nextTime = prev + 1;
        
        // Find if there is a lock at this nextTime
        const activeLock = currentVideoLocks.find((l: any) => nextTime >= l.timestamp && !completedQuizzes.has(l.quizId));
        if (activeLock) {
          setIsVideoPlaying(false);
          setVideoLocked(true);
          clearInterval(interval);
          return activeLock.timestamp;
        }

        if (nextTime >= videoDuration) {
          setIsVideoPlaying(false);
          return videoDuration;
        }
        return nextTime;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isVideoPlaying, videoLocked, completedQuizzes, activeGatingConfig]);

  const handleCompleteLesson = () => {
    if (!activeLesson || !course) return;

    const newCompleted = new Set(completedSet);
    newCompleted.add(activeLesson.id);
    setCompletedSet(newCompleted);
    localStorage.setItem('completed_lessons', JSON.stringify(Array.from(newCompleted)));

    // Re-enrich modules locking status
    const updatedModules = course.modules.map((mod: Module) => {
      const enrichedLessons = mod.lessons.map((les, index) => {
        const completed = newCompleted.has(les.id);
        let isLocked = false;
        if (index > 0) {
          const prevLesson = mod.lessons[index - 1];
          isLocked = !newCompleted.has(prevLesson.id);
        }
        return {
          ...les,
          completed,
          isLocked,
        };
      });
      return {
        ...mod,
        lessons: enrichedLessons,
      };
    });

    setCourse({
      ...course,
      modules: updatedModules,
    });

    // Automatically transition to next lesson if available
    let currentMod = course.modules[activeModuleIndex];
    let currentIdx = currentMod.lessons.findIndex(l => l.id === activeLesson.id);

    if (currentIdx + 1 < currentMod.lessons.length) {
      const nextL = updatedModules[activeModuleIndex].lessons[currentIdx + 1];
      if (!nextL.isLocked) {
        setActiveLesson(nextL);
      }
    } else if (activeModuleIndex + 1 < updatedModules.length) {
      const nextMod = updatedModules[activeModuleIndex + 1];
      if (nextMod.lessons.length > 0 && !nextMod.lessons[0].isLocked) {
        setActiveLesson(nextMod.lessons[0]);
        setActiveModuleIndex(activeModuleIndex + 1);
      }
    }
  };

  const copyCodeToClipboard = () => {
    const code = `class Node:
    def __init__(self, key):
        self.left = None
        self.right = None
        self.val = key

def insert(root, key):
    if root is None:
        return Node(key)
    # Recur down the tree structure
    if key < root.val:
        root.left = insert(root.left, key)
    else:
        root.right = insert(root.right, key)
    return root`;

    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-semibold text-slate-500 animate-pulse">Уншиж байна...</span>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-rose-600 font-semibold mb-4">Алдаа: {error || 'Хичээл олдсонгүй'}</p>
        <Link href="/courses" className="text-sm text-orange-500 font-bold hover:underline">
          Буцах
        </Link>
      </div>
    );
  }

  const renderGatedOverview = () => {
    const isDefaultMock = !activeLesson?.contentBody;
    const rawContent = activeLesson?.contentBody || `Бинар хайлтын мод (BST)-д шинэ утга оруулахын тулд эхлээд модын үндэс (root) зангилаатай харьцуулж үзнэ. Хэрэв оруулах утга нь үндэс зангилааны утгаас бага байвал зүүн дэд мод руу, их байвал баруун дэд мод руу рекурсив хэлбэрээр хайлт хийж, хамгийн төгсгөлийн хоосон (null) байрлалыг олох хүртэл үргэлжилнэ. Хоосон зайнд шинэ зангилааг амжилттай холбож өгнө.

[!quiz-1]

### COMPLEXITY & RECURRENCE RELATION (Хүндрэл ба Хугацааны хамаарал)
Тэнцвэртэй Бинар хайлтын мод (BST)-д шинэ утга оруулах хугацааны хүндрэл нь түвшин бүрт тогтмол буюу O(1) байна. Модны өндрөөс хамаарч нийт хугацааны хүндрэл нь логарифм хурдаар өснө.

* **Рекурсив тэгшитгэл**: T(n) = T(n/2) + O(1)
* **Нийт хугацааны хүндрэл**: Work = O(log n)

[!quiz-2]

### Python хэрэгжүүлэлтийн жишээ код (bst_insertion.py)`;

    const regex = /(\[!quiz-[a-zA-Z0-9_-]+\])/g;
    const parts = rawContent.split(regex);

    const rendered = [];
    let isLocked = false;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const match = part.match(/^\[!quiz-([a-zA-Z0-9_-]+)\]$/);

      if (match) {
        const quizId = match[1];
        rendered.push(
          <InteractiveQuizWidget
            key={`quiz-${quizId}`}
            quizId={quizId}
            isUnlocked={!isLocked}
            onSuccess={() => handleQuizSuccess(quizId)}
            isCompleted={completedQuizzes.has(quizId)}
          />
        );
        if (!completedQuizzes.has(quizId)) {
          isLocked = true;
        }
      } else {
        if (!isLocked) {
          rendered.push(
            <div key={`part-${i}`} className="animate-fadeIn">
              <MarkdownRenderer content={part} />
            </div>
          );
        } else {
          rendered.push(
            <div key={`locked-${i}`} className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/30 my-4 select-none">
              <Lock className="w-6 h-6 text-slate-300 mb-2 animate-pulse" />
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Үргэлжлэл хэсэг цоожтой байна</p>
              <p className="text-[10px] text-slate-400 mt-1">Дээрх сорилд зөв хариулж дараагийн агуулгыг нээнэ үү.</p>
            </div>
          );
          break;
        }
      }
    }

    if (!isLocked && isDefaultMock) {
      rendered.push(
        <div key="extra-components" className="space-y-6 pt-4 animate-fadeIn">
          <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900 rounded-xl p-4 space-y-2">
            <h4 className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              COMPLEXITY & RECURRENCE RELATION (Хүндрэл ба Хугацааны хамаарал)
            </h4>
            <div className="py-2 flex flex-col items-center justify-center font-serif text-sm bg-white/50 dark:bg-slate-900/50 rounded-lg text-slate-900 dark:text-slate-100">
              <span className="font-bold">T(n) = T(n/2) + O(1)</span>
              <span className="font-bold text-xs text-orange-500 mt-1">Work = O(log n)</span>
            </div>
          </div>

          <div className="bg-[#1b2b4d] rounded-xl overflow-hidden shadow-lg border border-slate-800">
            <div className="bg-[#0B1528] px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
              <span className="text-[10px] font-bold text-slate-400 font-mono">bst_insertion.py</span>
              <button
                onClick={copyCodeToClipboard}
                className="flex items-center gap-1 text-[9px] font-bold text-slate-400 hover:text-white transition-colors"
              >
                {copiedCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedCode ? 'Хуулагдлаа' : 'Хуулах'}</span>
              </button>
            </div>
            <div className="p-4 font-mono text-[11px] leading-relaxed overflow-x-auto text-slate-300 flex">
              <div className="text-slate-500 text-right pr-4 select-none border-r border-slate-800 shrink-0">
                <div>1</div><div>2</div><div>3</div><div>4</div><div>5</div>
                <div>6</div><div>7</div><div>8</div><div>9</div><div>10</div>
              </div>
              <div className="pl-4">
                <div><span className="text-orange-400">class</span> <span className="text-teal-400">Node</span>:</div>
                <div className="pl-4"><span className="text-orange-400">def</span> <span className="text-blue-400">__init__</span>(<span className="text-slate-400">self</span>, key):</div>
                <div className="pl-8"><span className="text-slate-400">self</span>.left = <span className="text-rose-400">None</span></div>
                <div className="pl-8"><span className="text-slate-400">self</span>.right = <span className="text-rose-400">None</span></div>
                <div className="pl-8"><span className="text-slate-400">self</span>.val = key</div>
                <div className="mt-1"><span className="text-orange-400">def</span> <span className="text-blue-400">insert</span>(root, key):</div>
                <div className="pl-4"><span className="text-orange-400">if</span> root <span className="text-orange-400">is</span> <span className="text-rose-400">None</span>:</div>
                <div className="pl-8"><span className="text-orange-400">return</span> <span className="text-teal-400">Node</span>(key)</div>
                <div className="pl-4 text-slate-500 font-sans italic"># Recur down the tree structure</div>
                <div className="pl-4"><span className="text-orange-400">if</span> key &lt; root.val:</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
              BST INSERTION DECISION FLOW (Оруулах урсгал шийдвэр)
            </h4>
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
              <div className="bg-slate-100 dark:bg-slate-850 px-4 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800">
                Эхлэл (Start)
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 md:rotate-0" />
              <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/50 px-4 py-2.5 rounded-xl text-xs font-bold text-orange-600 dark:text-orange-400 text-center">
                Утга &lt; Эх зангилаа?
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 rotate-90 md:rotate-0" />
              <div className="flex flex-row md:flex-col gap-2">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 px-3.5 py-1.5 rounded-lg text-[10px] font-black text-blue-600 dark:text-blue-400">
                  Тийм ➡️ Зүүн дэд мод
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-3.5 py-1.5 rounded-lg text-[10px] font-black text-amber-600 dark:text-amber-400">
                  Үгүй ➡️ Баруун дэд мод
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return rendered;
  };

  // Calculate overall course progress
  const allLessons = course.modules.flatMap(m => m.lessons);
  const totalLessons = allLessons.length;
  const completedCount = allLessons.filter(l => completedSet.has(l.id)).length;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950 flex text-slate-800 dark:text-slate-200">
      
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ==================== LEFT SIDEBAR ==================== */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 lg:z-auto
        w-[320px] h-screen bg-[#0B1528] text-white flex flex-col transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white/10 flex items-center justify-center shrink-0">
              <Image src="/GT-logo.png" alt="GT Logo" width={38} height={38} className="object-contain" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs font-black text-white leading-tight truncate uppercase tracking-wider">ГУРВАН ТАМИР ПК</h2>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Сургалтын платформ</p>
            </div>
          </div>
        </div>

        {/* Course Info & Overall Progress */}
        <div className="p-5 border-b border-slate-800 space-y-3">
          <div>
            <span className="text-[9px] font-black text-orange-400 tracking-wider uppercase bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded">
              {course.code}
            </span>
            <h1 className="text-sm font-extrabold text-white mt-1.5 leading-snug line-clamp-2">
              {course.title}
            </h1>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400 font-bold">
              <span>НИЙТ ЯВЦ</span>
              <span className="text-orange-400">{progressPercent}% дууссан</span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[9px] text-slate-500 font-bold uppercase">
              {completedCount}/{totalLessons} Хичээл үзсэн
            </p>
          </div>
        </div>

        {/* Modules Accordion / List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {course.modules.map((mod, mIdx) => {
            const completedInMod = mod.lessons.filter(l => completedSet.has(l.id)).length;
            const percentInMod = mod.lessons.length > 0 ? Math.round((completedInMod / mod.lessons.length) * 100) : 0;

            return (
              <div key={mod.id} className="space-y-2">
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    ЧАДАМЖИЙН НЭГЖ {mIdx + 1}
                  </span>
                  <h3 className="text-xs font-bold text-slate-200 line-clamp-1">
                    {mod.title}
                  </h3>
                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-medium mt-0.5">
                    <span>{percentInMod}% Completed</span>
                    <span>({completedInMod}/{mod.lessons.length} Lessons)</span>
                  </div>
                </div>

                {/* Lesson Items */}
                <div className="space-y-1 pl-1 border-l border-slate-800">
                  {mod.lessons.map((lesson, lIdx) => {
                    const isActive = activeLesson?.id === lesson.id;
                    return (
                      <button
                        key={lesson.id}
                        disabled={lesson.isLocked}
                        onClick={() => handleLessonSelect(lesson, mIdx)}
                        className={`w-full flex items-center justify-between text-left p-2 rounded-xl transition-all ${
                          isActive
                            ? 'bg-slate-800/80 text-white font-bold border border-slate-700/50'
                            : lesson.isLocked
                            ? 'opacity-40 cursor-not-allowed text-slate-500'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {completedSet.has(lesson.id) ? (
                            <CheckCircle className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          ) : isActive ? (
                            <div className="w-3.5 h-3.5 rounded-full border-2 border-orange-500 flex items-center justify-center shrink-0">
                              <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            </div>
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-slate-600 shrink-0" />
                          )}
                          <span className="text-[11px] truncate leading-tight">
                            {lIdx + 1}. {lesson.title}
                          </span>
                        </div>
                        <span className="text-[8px] font-semibold text-slate-500 shrink-0 pl-1">
                          {lesson.isLocked ? <Lock className="w-2.5 h-2.5" /> : '15m'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back Link */}
        <div className="p-4 border-t border-slate-800">
          <Link href="/courses" className="flex items-center justify-center gap-2 bg-slate-800/50 hover:bg-slate-800 hover:text-white py-2 rounded-xl text-xs font-bold text-slate-300 transition-all border border-slate-800">
            <ArrowLeft className="w-4 h-4" />
            <span>Курсууд рүү буцах</span>
          </Link>
        </div>
      </aside>

      {/* ==================== MAIN CONTENT AREA ==================== */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              <Menu className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
              <span className="hover:underline cursor-pointer" onClick={() => router.push('/courses')}>Хичээлүүд</span>
              <ChevronRight className="w-3 h-3" />
              <span className="truncate max-w-[120px]">{course.title}</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-600 dark:text-slate-200 truncate max-w-[120px]">
                {activeLesson?.title || 'Хичээл'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!completedSet.has(activeLesson?.id || '') && activeLesson && (
              <button
                onClick={handleCompleteLesson}
                className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl shadow-md shadow-emerald-500/10 transition-all flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                ҮЗСЭН ГЭЖ ТЭМДЭГЛЭХ
              </button>
            )}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-bold">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 lg:p-6 max-w-4xl w-full mx-auto space-y-6 overflow-y-auto">
          
          {/* Title & Info */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">
              Чадамжийн элемент {activeLesson?.order || 1}
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">
              {activeLesson?.title || 'Binary Search Trees: Insertion & Traversal'}
            </h2>
          </div>

          {/* ==================== CONTENT DISPLAY (VIDEO / PDF) ==================== */}
          {/* ==================== CONTENT DISPLAY (VIDEO / PDF / MARKDOWN) ==================== */}
          {activeLesson?.contentType === 'PDF' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-orange-500" />
                  <span className="font-bold text-xs">Хичээлийн гарын авлага (PDF)</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    onClick={() => setPdfPage(p => Math.max(1, p - 1))}
                    disabled={pdfPage === 1}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-200"
                  >
                    Өмнөх
                  </button>
                  <span className="font-mono text-xs text-slate-500">
                    Хуудас: {pdfPage} / 10
                  </span>
                  <button
                    onClick={() => {
                      const nextP = pdfPage + 1;
                      const currentPdfLocks = activeGatingConfig?.pdfLocks || [{ lockPage: 5, quizId: 'quiz-pdf-1' }];
                      const nextLock = currentPdfLocks.find((l: any) => nextP >= l.lockPage && !completedQuizzes.has(l.quizId));
                      if (nextLock) {
                        setPdfPage(nextLock.lockPage);
                        setPdfLocked(true);
                      } else {
                        setPdfPage(p => Math.min(10, p + 1));
                      }
                    }}
                    disabled={pdfPage === 10}
                    className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-400 disabled:opacity-50 hover:bg-slate-200"
                  >
                    Дараах
                  </button>
                </div>
              </div>

              {(() => {
                const currentPdfLocks = activeGatingConfig?.pdfLocks || [{ lockPage: 5, quizId: 'quiz-pdf-1' }];
                const activePdfLock = currentPdfLocks.find((l: any) => pdfPage >= l.lockPage && !completedQuizzes.has(l.quizId));

                if (activePdfLock) {
                  return (
                    <div className="p-8 border border-dashed border-orange-300 dark:border-orange-900/50 rounded-xl bg-orange-50/5 text-center space-y-4">
                      <Lock className="w-8 h-8 text-orange-500 mx-auto animate-pulse" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">Хуудас цоожтой байна</h4>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        {activePdfLock.lockPage}-р хуудаснаас хойших гарын авлагын материалыг үзэхийн тулд доорх сорилд зөв хариулна уу.
                      </p>
                      <div className="text-left max-w-md mx-auto">
                        <InteractiveQuizWidget
                          quizId={activePdfLock.quizId}
                          isUnlocked={true}
                          onSuccess={() => handleQuizSuccess(activePdfLock.quizId)}
                          isCompleted={completedQuizzes.has(activePdfLock.quizId)}
                        />
                      </div>
                    </div>
                  );
                }

                return null;
              })() || (
                <div className="prose prose-slate dark:prose-invert max-w-none p-8 bg-slate-50 dark:bg-slate-950 rounded-xl min-h-[220px] flex items-center justify-center text-center">
                  <div className="space-y-2">
                    <p className="text-xs text-slate-400 font-bold uppercase">Хуудас {pdfPage}</p>
                    <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      {pdfPage === 1 ? '1. Бинар хайлтын модны үндсэн тодорхойлолт' :
                       pdfPage === 2 ? '2. Зангилаа оруулах алгоритмын логик' :
                       pdfPage === 3 ? '3. Рекурсив болон рекурсив бус хайлтын харьцуулалт' :
                       pdfPage === 4 ? '4. Санах ойн хэрэглээ ба тэнцвэржүүлэлт' :
                       '5. Нарийвчилсан сэдвүүд, Хүндрэлийн зэрэг болон дадлага бодлогууд'}
                    </h5>
                    <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                      Энэхүү гарын авлага нь хичээлийн сэдвийг илүү гүнзгийрүүлэн судлахад туслах бөгөөд сэдэвчилсэн жишээ, бодлогуудыг багтаасан болно.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : activeLesson?.contentType === 'MARKDOWN' ? (
            /* ==================== MARKDOWN DIRECT SHEET ==================== */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
              {renderGatedOverview()}
            </div>
          ) : (
            /* ==================== MOCKUP VIDEO PLAYER ==================== */
            <div className="bg-[#0B1528] rounded-2xl border border-slate-800 shadow-xl overflow-hidden relative aspect-video flex flex-col justify-between group">
              {videoLocked ? (
                /* Video Gating Quiz Overlay */
                <div className="absolute inset-0 z-30 bg-slate-950/90 backdrop-blur-md p-6 flex flex-col items-center justify-center overflow-y-auto">
                  <div className="w-full max-w-md space-y-3">
                    <div className="flex items-center gap-2 text-orange-500 text-xs font-black">
                      <Lock className="w-4 h-4 animate-pulse" />
                      <span>ВИДЕО ЦООЖЛОГДСОН (ХУГАЦАА: 0:15)</span>
                    </div>
                    <p className="text-[11px] text-slate-400">Видеоны цаашдын хэсгийг үзэхийн тулд доорх сорилтод зөв хариулна уу.</p>
                    <InteractiveQuizWidget
                      quizId="quiz-vid-1"
                      isUnlocked={true}
                      onSuccess={() => handleQuizSuccess('quiz-vid-1')}
                      isCompleted={completedQuizzes.has('quiz-vid-1')}
                    />
                  </div>
                </div>
              ) : (
                /* Tree Graph Screen mockup inside the video player */
                <div className="absolute inset-0 flex items-center justify-center p-8 bg-slate-950/70 select-none">
                  {!isVideoPlaying ? (
                    // SVG diagram matching the tree structure inside the video screen
                    <svg viewBox="0 0 400 240" className="w-full max-w-md h-auto opacity-70 transition-opacity duration-300">
                      <path d="M 200,40 L 120,90" stroke="#f97316" strokeWidth="2" strokeDasharray="3 3" />
                      <path d="M 200,40 L 280,90" stroke="#f97316" strokeWidth="2" strokeDasharray="3 3" />
                      <path d="M 120,90 L 70,140" stroke="#f97316" strokeWidth="2" strokeDasharray="3 3" />
                      <path d="M 120,90 L 170,140" stroke="#f97316" strokeWidth="2" strokeDasharray="3 3" />
                      <path d="M 280,90 L 230,140" stroke="#f97316" strokeWidth="2" strokeDasharray="3 3" />
                      <path d="M 280,90 L 330,140" stroke="#f97316" strokeWidth="2" strokeDasharray="3 3" />
                      
                      {/* Nodes */}
                      <circle cx="200" cy="40" r="18" fill="#1b2b4d" stroke="#f97316" strokeWidth="2" />
                      <text x="200" y="44" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">50</text>
 
                      <circle cx="120" cy="90" r="18" fill="#1b2b4d" stroke="#f97316" strokeWidth="2" />
                      <text x="120" y="94" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">30</text>
 
                      <circle cx="280" cy="90" r="18" fill="#1b2b4d" stroke="#f97316" strokeWidth="2" />
                      <text x="280" y="94" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">70</text>
 
                      <circle cx="70" cy="140" r="18" fill="#1b2b4d" stroke="#f97316" strokeWidth="2" />
                      <text x="70" y="144" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">20</text>
 
                      <circle cx="170" cy="140" r="18" fill="#1b2b4d" stroke="#f97316" strokeWidth="2" />
                      <text x="170" y="144" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">40</text>
 
                      <circle cx="230" cy="140" r="18" fill="#1b2b4d" stroke="#f97316" strokeWidth="2" />
                      <text x="230" y="144" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">60</text>
 
                      <circle cx="330" cy="140" r="18" fill="#1b2b4d" stroke="#f97316" strokeWidth="2" />
                      <text x="330" y="144" fill="#fff" fontSize="10" fontWeight="bold" textAnchor="middle">80</text>
                    </svg>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-[10px] font-bold text-slate-400 tracking-wider">Видеог тоглуулж байна... ({formatTime(videoTime)})</span>
                    </div>
                  )}
                </div>
              )}
 
              {/* Play Button Overlay */}
              {!isVideoPlaying && !videoLocked && (
                <button
                  onClick={() => setIsVideoPlaying(true)}
                  className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/95 text-slate-900 shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-20 group-hover:bg-orange-500 group-hover:text-white"
                >
                  <Play className="w-6 h-6 fill-current pl-1" />
                </button>
              )}
 
              {/* Top header bar overlay */}
              <div className="relative z-10 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="font-bold">{activeLesson?.title || 'BST: Insertion & Traversal'}</span>
                <span className="bg-orange-500 text-white font-extrabold text-[8px] px-2 py-0.5 rounded">1080p HD</span>
              </div>
 
              {/* Control Bar Overlay */}
              <div className="relative z-10 p-3 bg-gradient-to-t from-black/90 to-transparent space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                {/* Timeline bar */}
                <div className="relative h-1 bg-white/20 rounded-full cursor-pointer overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-orange-500 rounded-full transition-all"
                    style={{ width: `${(videoTime / videoDuration) * 100}%` }}
                  />
                </div>
 
                {/* Control buttons */}
                <div className="flex items-center justify-between text-white text-[11px] font-bold">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsVideoPlaying(!isVideoPlaying)} className="hover:text-orange-400 transition-colors">
                      {isVideoPlaying ? 'Түр зогсоох' : 'Тоглуулах'}
                    </button>
                    <span className="text-[10px] text-slate-400">
                      {formatTime(videoTime)} / {formatTime(videoDuration)}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                      <div className="w-12 h-1 bg-white/30 rounded-full overflow-hidden">
                        <div className="w-3/4 h-full bg-white" />
                      </div>
                    </div>
                  </div>
 
                  <div className="flex items-center gap-4">
                    <span className="hover:text-orange-400 cursor-pointer">1.0x Хурд</span>
                    <span className="hover:text-orange-400 cursor-pointer">Тайлбар (CC)</span>
                    <Maximize2 className="w-3.5 h-3.5 text-slate-400 hover:text-white cursor-pointer" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TABS ==================== */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto whitespace-nowrap scrollbar-none">
            {(activeLesson?.contentType === 'MARKDOWN'
              ? ['grades', 'chat', 'transcript', 'notes', 'resources']
              : ['overview', 'grades', 'chat', 'transcript', 'notes', 'resources']
            ).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-all border-b-2 ${
                  activeTab === tab
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {tab === 'overview' ? 'Тойм (Overview)' :
                 tab === 'grades' ? 'Үнэлгээ (Grades)' :
                 tab === 'chat' ? 'Харилцах (Chat)' :
                 tab === 'transcript' ? 'Бичвэр (Transcript)' :
                 tab === 'notes' ? 'Тэмдэглэл (Notes)' : 'Материал (Resources)'}
              </button>
            ))}
          </div>

          {/* ==================== TAB CONTENT: OVERVIEW ==================== */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fadeIn">
              {renderGatedOverview()}
            </div>
          )}

          {/* ==================== TAB CONTENT: GRADES ==================== */}
          {activeTab === 'grades' && (
            <div className="space-y-6 animate-fadeIn">
              {gradesLoading ? (
                <div className="flex justify-center p-8">
                  <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : gradesData ? (
                <div className="space-y-6">
                  {/* Status Banner */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl gap-4 shadow-sm">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase">ЧАДАМЖИЙН ҮНЭЛГЭЭНИЙ ТӨЛӨВ</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        {gradesData.cbtStatus === 'COMPETENT' ? (
                          <span className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-600 dark:text-emerald-400 font-black text-xs px-3.5 py-1.5 rounded-xl uppercase tracking-wider">
                            ЧАДАМЖТАЙ (COMPETENT)
                          </span>
                        ) : gradesData.cbtStatus === 'NOT_YET_COMPETENT' ? (
                          <span className="bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 font-black text-xs px-3.5 py-1.5 rounded-xl uppercase tracking-wider animate-pulse">
                            ХАРААХАН ЧАДАМЖГҮЙ (NYC)
                          </span>
                        ) : gradesData.cbtStatus === 'RE_ASSESSMENT_REQ' ? (
                          <span className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 font-black text-xs px-3.5 py-1.5 rounded-xl uppercase tracking-wider">
                            ДАХИН ҮНЭЛГЭЭ ХҮССЭН
                          </span>
                        ) : (
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs px-3 py-1 rounded-xl uppercase">
                            ҮНЭЛЭЭГҮЙ
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-medium">ESIS Стандарт нийцэл</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 border-l border-slate-100 dark:border-slate-800 pl-0 md:pl-6">
                      <div className="text-center">
                        <span className="text-xl font-extrabold text-orange-500">{gradesData.progress?.percent}%</span>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Хичээл үзэлт</p>
                      </div>
                      <div className="text-center">
                        <span className="text-xl font-extrabold text-blue-500">{gradesData.quizAttempts?.length}</span>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">Тест ажилласан</p>
                      </div>
                    </div>
                  </div>

                  {/* Quizzes attempts */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Явцын сорилын дүн</h3>
                    {gradesData.quizAttempts?.length === 0 ? (
                      <p className="text-xs text-slate-400">Сорилын оролдлого байхгүй байна.</p>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800">
                        {gradesData.quizAttempts.map((attempt: any) => (
                          <div key={attempt.id} className="py-3 flex items-center justify-between text-xs">
                            <div>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{attempt.quiz.title}</p>
                              <p className="text-[10px] text-slate-400">{new Date(attempt.completedAt).toLocaleDateString('mn-MN')}</p>
                            </div>
                            <div className="text-right flex items-center gap-3">
                              <div>
                                <span className="font-bold text-slate-900 dark:text-slate-100">{attempt.score}%</span>
                                <p className="text-[9px] text-slate-400">Босго оноо: {attempt.quiz.passScore}%</p>
                              </div>
                              {attempt.passed ? (
                                <span className="bg-emerald-500/10 text-emerald-500 font-extrabold text-[9px] px-2 py-0.5 rounded">ТЭНЦСЭН</span>
                              ) : (
                                <span className="bg-rose-500/10 text-rose-500 font-extrabold text-[9px] px-2 py-0.5 rounded">ТЭНЦЭЭГҮЙ</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submissions & Rubrics */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Практик & Бие даалтын үнэлгээ</h3>
                    {gradesData.submissions?.length === 0 ? (
                      <p className="text-xs text-slate-400">Илгээсэн даалгавар байхгүй байна.</p>
                    ) : (
                      <div className="space-y-4">
                        {gradesData.submissions.map((sub: any) => (
                          <div key={sub.id} className="border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex justify-between items-start">
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white">{sub.assignment.title}</h4>
                                <p className="text-[9px] text-slate-400">Илгээсэн: {new Date(sub.submittedAt).toLocaleDateString('mn-MN')}</p>
                              </div>
                              <div className="text-right">
                                <span className="text-sm font-extrabold text-orange-500">{sub.score ? `${Math.round(sub.score)}%` : 'Үнэлэгдээгүй'}</span>
                                <p className="text-[9px] text-slate-400">Хамгийн их оноо: {sub.assignment.maxScore}</p>
                              </div>
                            </div>

                            {/* Rubrics details */}
                            {sub.rubricScores?.length > 0 && (
                              <div className="bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800 space-y-2">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Рубрик шалгуурын задаргаа</span>
                                <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-850">
                                  {sub.rubricScores.map((score: any) => (
                                    <div key={score.id} className="pt-1.5 flex items-center justify-between text-[11px]">
                                      <span className="text-slate-650 dark:text-slate-400">{score.criteria.description}</span>
                                      <span className="font-bold text-slate-900 dark:text-white pl-2">
                                        {score.scoreEarned} / {score.criteria.points} оноо
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Teacher feedback */}
                            {sub.feedback && (
                              <div className="text-xs bg-orange-500/5 border-l-2 border-orange-500 p-2.5 rounded-r-lg space-y-1">
                                <span className="font-bold text-[10px] text-orange-500 uppercase tracking-wide">Багш/Менторын санал хүсэлт:</span>
                                <p className="text-slate-600 dark:text-slate-400 italic">"{sub.feedback}"</p>
                                {sub.rubricScores?.[0]?.evaluator && (
                                  <p className="text-[9px] text-slate-400 text-right font-bold">— Үнэлсэн: {sub.rubricScores[0].evaluator.fullName} ({sub.rubricScores[0].evaluator.roles.join(', ')})</p>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400">Үнэлгээний мэдээлэл олдсонгүй.</p>
              )}
            </div>
          )}

          {/* ==================== TAB CONTENT: CHAT ==================== */}
          {activeTab === 'chat' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm h-[480px] flex overflow-hidden animate-fadeIn">
              {/* Contacts list */}
              <div className="w-[180px] md:w-[240px] border-r border-slate-100 dark:border-slate-800 flex flex-col shrink-0">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Сувгууд & Холбоо барих</span>
                </div>
                <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
                  {chatContacts.length === 0 ? (
                    <p className="text-[10px] text-slate-400 p-3">Идэвхтэй харилцагч олдсонгүй.</p>
                  ) : (
                    chatContacts.map((contact) => (
                      <button
                        key={contact.id}
                        onClick={() => {
                          setActiveContact(contact);
                          fetchConversation(contact.id);
                        }}
                        className={`w-full text-left p-2 rounded-xl text-xs flex items-center gap-2 transition-all ${
                          activeContact?.id === contact.id
                            ? 'bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-650 dark:text-slate-400'
                        }`}
                      >
                        <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center font-bold text-[10px] shrink-0 text-slate-600 dark:text-slate-350">
                          {contact.fullName.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate leading-snug">{contact.fullName}</p>
                          <p className="text-[9px] text-slate-400 truncate">{contact.roles.join(', ')}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat frame */}
              <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30 dark:bg-slate-900/10">
                {activeContact ? (
                  <>
                    {/* Frame Header */}
                    <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shrink-0">
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white leading-snug">{activeContact.fullName}</h4>
                        <p className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">{activeContact.roles.join(', ')}</p>
                      </div>
                      <button
                        onClick={() => fetchConversation(activeContact.id)}
                        className="text-[10px] font-black text-slate-400 hover:text-slate-600 hover:underline"
                      >
                        Шинэчлэх
                      </button>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {chatLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                      ) : conversation.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-6">Зурвасын түүх байхгүй байна. Эхний зурвасаа илгээнэ үү.</p>
                      ) : (
                        conversation.map((msg) => {
                          const isSelf = msg.senderId === user?.id;
                          return (
                            <div key={msg.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                                isSelf
                                  ? 'bg-orange-500 text-white rounded-tr-none'
                                  : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800 rounded-tl-none'
                              }`}>
                                <p className="leading-relaxed">{msg.content}</p>
                                <span className={`text-[8px] font-medium block text-right mt-1 ${isSelf ? 'text-orange-200' : 'text-slate-400'}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Chat Input */}
                    <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
                      <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Зурвас бичих..."
                        className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500 text-slate-850 dark:text-slate-100"
                      />
                      <button
                        type="submit"
                        disabled={!messageText.trim()}
                        className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-black text-xs px-4 py-2 rounded-xl transition-all"
                      >
                        Илгээх
                      </button>
                    </form>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-6 text-center select-none">
                    <BookOpen className="w-8 h-8 text-slate-300 mb-2" />
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Чатлах харилцагчаа сонгоно уу</p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">Зүүн талын жагсаалтаас багш эсвэл суралцагч сонгон чатлаж болно.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== TAB CONTENT: TRANSCRIPT ==================== */}
          {activeTab === 'transcript' && (
            <div className="space-y-4 text-xs md:text-sm text-slate-600 dark:text-slate-400 animate-fadeIn">
              <div className="flex items-start gap-4">
                <span className="font-mono text-orange-500 font-bold shrink-0">00:10</span>
                <p>Сайн байцгаана уу, өнөөдрийн хичээлээр бид Бинар хайлтын модонд шинэ утга хэрхэн нэмэх талаар дэлгэрэнгүй үзэх болно.</p>
              </div>
              <div className="flex items-start gap-4">
                <span className="font-mono text-orange-500 font-bold shrink-0">01:45</span>
                <p>Хайлтын модны оруулах үйлдэл нь хайлттай маш төстэй. Утга бага бол зүүн тал руу, их бол баруун тал руу зөөгдөнө.</p>
              </div>
              <div className="flex items-start gap-4">
                <span className="font-mono text-orange-500 font-bold shrink-0">05:20</span>
                <p>Интеграцийн хувьд бид O(log n) хугацаанд гүйцэтгэх тэнцвэртэй модыг зорилго болгодог.</p>
              </div>
            </div>
          )}

          {/* ==================== TAB CONTENT: NOTES ==================== */}
          {activeTab === 'notes' && (
            <div className="space-y-3 animate-fadeIn">
              <textarea
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
                placeholder="Хичээлтэй холбоотой өөрийн тэмдэглэлээ энд хөтөлж хадгална уу..."
                className="w-full h-40 p-4 text-xs md:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/30 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
              />
              <button
                onClick={saveNotes}
                className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white py-2 px-5 rounded-xl text-xs font-bold transition-all shadow-md shadow-orange-500/10"
              >
                Тэмдэглэл хадгалах
              </button>
            </div>
          )}

          {/* ==================== TAB CONTENT: RESOURCES ==================== */}
          {activeTab === 'resources' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fadeIn">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-orange-950/20 flex items-center justify-center text-orange-500 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold">Хичээлийн гарын авлага</h5>
                    <p className="text-[9px] text-slate-400">PDF формат • 2.4 MB</p>
                  </div>
                </div>
                <button className="text-[10px] font-black text-orange-500 hover:underline">Татах</button>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-950/20 flex items-center justify-center text-blue-500 shrink-0">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold">Эх код (Хичээлийн дадлага)</h5>
                    <p className="text-[9px] text-slate-400">Python script • 15 KB</p>
                  </div>
                </div>
                <button className="text-[10px] font-black text-orange-500 hover:underline">Татах</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
